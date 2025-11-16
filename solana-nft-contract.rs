use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        CreateMetadataAccountsV3, Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("6LonwXhpVy4feWGj1pc1ucKTkpmpbzYUsx46NExdMXdg");

#[program]
pub mod achievements {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let achievement_state = &mut ctx.accounts.achievement_state;
        achievement_state.authority = ctx.accounts.authority.key();
        achievement_state.total_minted = 0;
        msg!("✅ Achievement State initialized");
        Ok(())
    }

    pub fn mint_achievement(
        ctx: Context<MintAchievement>,
        achievement_id: String,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let achievement_state = &mut ctx.accounts.achievement_state;
        let user_achievement = &mut ctx.accounts.user_achievement;

        // 检查是否已经领取
        require!(
            !user_achievement.is_claimed,
            AchievementError::AlreadyClaimed
        );

        // 铸造 NFT (mint 1 token)
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.mint.to_account_info(),
            },
        );
        mint_to(cpi_context, 1)?;

        // 创建 Metaplex Metadata
        let data_v2 = DataV2 {
            name,
            symbol,
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let cpi_context = CpiContext::new(
            ctx.accounts.metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.mint.to_account_info(),
                update_authority: ctx.accounts.mint.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );
        create_metadata_accounts_v3(cpi_context, data_v2, true, true, None)?;

        // 记录领取信息
        user_achievement.user = ctx.accounts.user.key();
        user_achievement.achievement_id = achievement_id;
        user_achievement.is_claimed = true;
        user_achievement.mint_timestamp = Clock::get()?.unix_timestamp;
        user_achievement.mint_number = achievement_state.total_minted + 1;
        user_achievement.mint = ctx.accounts.mint.key();

        achievement_state.total_minted += 1;

        msg!("🎉 Achievement NFT minted successfully!");
        Ok(())
    }
}

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
#[instruction(achievement_id: String)]
pub struct MintAchievement<'info> {
    #[account(
        mut,
        seeds = [b"achievement_state"],
        bump
    )]
    pub achievement_state: Account<'info, AchievementState>,

    #[account(
        init,
        payer = user,
        space = 8 + UserAchievement::INIT_SPACE,
        seeds = [b"user_achievement", user.key().as_ref(), achievement_id.as_bytes()],
        bump
    )]
    pub user_achievement: Account<'info, UserAchievement>,

    /// 新的 NFT mint 账户
    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = mint,
        mint::freeze_authority = mint,
    )]
    pub mint: Account<'info, Mint>,

    /// 用户的 token 账户
    #[account(
        init_if_needed,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// Metaplex Metadata 账户
    /// CHECK: 由 Metaplex 程序验证
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub metadata_program: Program<'info, Metadata>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[account]
#[derive(InitSpace)]
pub struct AchievementState {
    pub authority: Pubkey,
    pub total_minted: u64,
}

#[account]
#[derive(InitSpace)]
pub struct UserAchievement {
    pub user: Pubkey,
    #[max_len(50)]
    pub achievement_id: String,
    pub is_claimed: bool,
    pub mint_timestamp: i64,
    pub mint_number: u64,
    pub mint: Pubkey,
}

#[error_code]
pub enum AchievementError {
    #[msg("This achievement has already been claimed")]
    AlreadyClaimed,
}
