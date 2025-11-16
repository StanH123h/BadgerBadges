use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::metadata::{
    create_metadata_accounts_v3, CreateMetadataAccountsV3, Metadata as MetadataProgram,
};
use mpl_token_metadata::types::{DataV2, Creator};

declare_id!("YOUR_PROGRAM_ID_WILL_BE_HERE");

#[program]
pub mod achievements {
    use super::*;

    /// Initialize the achievements program
    pub fn initialize(ctx: Context<Initialize>, backend_signer: Pubkey) -> Result<()> {
        let achievement_state = &mut ctx.accounts.achievement_state;
        achievement_state.authority = ctx.accounts.authority.key();
        achievement_state.backend_signer = backend_signer;
        achievement_state.total_minted = 0;

        msg!("🦡 BadgerBadge Achievements initialized!");
        msg!("Authority: {}", achievement_state.authority);
        msg!("Backend Signer: {}", achievement_state.backend_signer);

        Ok(())
    }

    /// Mint an achievement NFT
    ///
    /// Security: Backend signs (user, achievement_id, nonce, deadline)
    /// User submits signature to prove eligibility
    pub fn mint_achievement(
        ctx: Context<MintAchievement>,
        achievement_id: [u8; 32],
        nonce: [u8; 32],
        deadline: i64,
        signature: [u8; 64],
    ) -> Result<()> {
        let achievement_state = &mut ctx.accounts.achievement_state;
        let user_achievement = &mut ctx.accounts.user_achievement;
        let clock = Clock::get()?;

        // 1. Check deadline
        require!(
            clock.unix_timestamp <= deadline,
            AchievementError::SignatureExpired
        );

        // 2. Check if already claimed
        require!(
            !user_achievement.is_claimed,
            AchievementError::AlreadyClaimed
        );

        // 3. Verify signature from backend
        let message = create_message(
            &ctx.accounts.user.key(),
            &achievement_id,
            &nonce,
            deadline,
        );

        verify_signature(
            &message,
            &signature,
            &achievement_state.backend_signer,
        )?;

        // 4. Mark as claimed
        user_achievement.user = ctx.accounts.user.key();
        user_achievement.achievement_id = achievement_id;
        user_achievement.is_claimed = true;
        user_achievement.mint_timestamp = clock.unix_timestamp;
        user_achievement.mint_number = achievement_state.total_minted + 1;

        // 5. Increment counter
        achievement_state.total_minted += 1;

        // 6. Mint the NFT (1 token, 0 decimals = NFT)
        token::mint_to(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::MintTo {
                    mint: ctx.accounts.mint.to_account_info(),
                    to: ctx.accounts.token_account.to_account_info(),
                    authority: ctx.accounts.mint.to_account_info(),
                },
            ),
            1, // Amount: 1 token
        )?;

        msg!("✅ Achievement minted!");
        msg!("User: {}", ctx.accounts.user.key());
        msg!("Achievement ID: {:?}", achievement_id);
        msg!("Mint Number: {}", user_achievement.mint_number);

        Ok(())
    }

    /// Create metadata for the NFT
    pub fn create_achievement_metadata(
        ctx: Context<CreateAchievementMetadata>,
        achievement_name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let achievement_state = &ctx.accounts.achievement_state;

        // Create metadata account
        create_metadata_accounts_v3(
            CpiContext::new(
                ctx.accounts.metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: ctx.accounts.metadata.to_account_info(),
                    mint: ctx.accounts.mint.to_account_info(),
                    mint_authority: ctx.accounts.mint.to_account_info(),
                    update_authority: ctx.accounts.authority.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            DataV2 {
                name: achievement_name,
                symbol,
                uri,
                seller_fee_basis_points: 0,
                creators: Some(vec![Creator {
                    address: achievement_state.authority,
                    verified: true,
                    share: 100,
                }]),
                collection: None,
                uses: None,
            },
            true,  // is_mutable
            true,  // update_authority_is_signer
            None,  // collection_details
        )?;

        msg!("✅ Metadata created!");
        Ok(())
    }

    /// Update backend signer (admin only)
    pub fn update_backend_signer(
        ctx: Context<UpdateBackendSigner>,
        new_signer: Pubkey,
    ) -> Result<()> {
        let achievement_state = &mut ctx.accounts.achievement_state;

        require!(
            ctx.accounts.authority.key() == achievement_state.authority,
            AchievementError::Unauthorized
        );

        let old_signer = achievement_state.backend_signer;
        achievement_state.backend_signer = new_signer;

        msg!("Backend signer updated from {} to {}", old_signer, new_signer);
        Ok(())
    }
}

// ========== CONTEXTS ==========

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + AchievementState::INIT_SPACE,
        seeds = [b"achievement_state"],
        bump
    )]
    pub achievement_state: Account<'info, AchievementState>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(achievement_id: [u8; 32])]
pub struct MintAchievement<'info> {
    #[account(
        mut,
        seeds = [b"achievement_state"],
        bump
    )]
    pub achievement_state: Account<'info, AchievementState>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserAchievement::INIT_SPACE,
        seeds = [b"user_achievement", user.key().as_ref(), &achievement_id],
        bump
    )]
    pub user_achievement: Account<'info, UserAchievement>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,  // NFT = 0 decimals
        mint::authority = mint,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct CreateAchievementMetadata<'info> {
    #[account(
        seeds = [b"achievement_state"],
        bump
    )]
    pub achievement_state: Account<'info, AchievementState>,

    #[account(mut)]
    pub mint: Account<'info, Mint>,

    /// CHECK: Metadata account will be created by Metaplex
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub metadata_program: Program<'info, MetadataProgram>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateBackendSigner<'info> {
    #[account(
        mut,
        seeds = [b"achievement_state"],
        bump
    )]
    pub achievement_state: Account<'info, AchievementState>,

    pub authority: Signer<'info>,
}

// ========== STATE ACCOUNTS ==========

#[account]
#[derive(InitSpace)]
pub struct AchievementState {
    pub authority: Pubkey,         // Program admin
    pub backend_signer: Pubkey,    // Backend that validates claims
    pub total_minted: u64,         // Total achievements minted
}

#[account]
#[derive(InitSpace)]
pub struct UserAchievement {
    pub user: Pubkey,              // User who claimed
    pub achievement_id: [u8; 32],  // Achievement identifier
    pub is_claimed: bool,          // Has been claimed
    pub mint_timestamp: i64,       // When it was minted
    pub mint_number: u64,          // Order of minting (for rarity)
}

// ========== HELPER FUNCTIONS ==========

fn create_message(
    user: &Pubkey,
    achievement_id: &[u8; 32],
    nonce: &[u8; 32],
    deadline: i64,
) -> Vec<u8> {
    let mut message = Vec::new();
    message.extend_from_slice(user.as_ref());
    message.extend_from_slice(achievement_id);
    message.extend_from_slice(nonce);
    message.extend_from_slice(&deadline.to_le_bytes());
    message
}

fn verify_signature(
    message: &[u8],
    signature: &[u8; 64],
    expected_signer: &Pubkey,
) -> Result<()> {
    use ed25519_dalek::{Signature, Verifier, VerifyingKey};

    let verifying_key = VerifyingKey::from_bytes(expected_signer.as_ref())
        .map_err(|_| AchievementError::InvalidSignature)?;

    let sig = Signature::from_bytes(signature);

    verifying_key
        .verify(message, &sig)
        .map_err(|_| AchievementError::InvalidSignature)?;

    Ok(())
}

// ========== ERRORS ==========

#[error_code]
pub enum AchievementError {
    #[msg("Signature has expired")]
    SignatureExpired,

    #[msg("Achievement already claimed by this user")]
    AlreadyClaimed,

    #[msg("Invalid signature from backend")]
    InvalidSignature,

    #[msg("Unauthorized: Only admin can perform this action")]
    Unauthorized,
}
