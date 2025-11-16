use anchor_lang::prelude::*;

// 这个ID会在第一次build后自动生成，现在先用占位符
declare_id!("11111111111111111111111111111111");

#[program]
pub mod achievements {
    use super::*;

    /// 初始化程序
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

    /// Mint成就（简化版 - 不涉及真正的NFT，只记录）
    pub fn claim_achievement(
        ctx: Context<ClaimAchievement>,
        achievement_id: String,
    ) -> Result<()> {
        let achievement_state = &mut ctx.accounts.achievement_state;
        let user_achievement = &mut ctx.accounts.user_achievement;
        let clock = Clock::get()?;

        // 检查是否已经claim过
        require!(!user_achievement.is_claimed, AchievementError::AlreadyClaimed);

        // 记录claim
        user_achievement.user = ctx.accounts.user.key();
        user_achievement.achievement_id = achievement_id.clone();
        user_achievement.is_claimed = true;
        user_achievement.mint_timestamp = clock.unix_timestamp;
        user_achievement.mint_number = achievement_state.total_minted + 1;

        // 增加计数
        achievement_state.total_minted += 1;

        msg!("✅ Achievement claimed!");
        msg!("User: {}", ctx.accounts.user.key());
        msg!("Achievement: {}", achievement_id);
        msg!("Number: {}", user_achievement.mint_number);

        Ok(())
    }

    /// 查询用户是否已claim
    pub fn has_claimed(ctx: Context<CheckClaim>) -> Result<bool> {
        Ok(ctx.accounts.user_achievement.is_claimed)
    }
}

// ========== 上下文定义 ==========

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
pub struct ClaimAchievement<'info> {
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
        seeds = [
            b"user_achievement",
            user.key().as_ref(),
            achievement_id.as_bytes()
        ],
        bump
    )]
    pub user_achievement: Account<'info, UserAchievement>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CheckClaim<'info> {
    pub user_achievement: Account<'info, UserAchievement>,
}

// ========== 数据结构 ==========

#[account]
#[derive(InitSpace)]
pub struct AchievementState {
    pub authority: Pubkey,         // 32字节
    pub backend_signer: Pubkey,    // 32字节
    pub total_minted: u64,         // 8字节
}

#[account]
#[derive(InitSpace)]
pub struct UserAchievement {
    pub user: Pubkey,              // 32字节
    #[max_len(50)]
    pub achievement_id: String,    // 4 + 50字节
    pub is_claimed: bool,          // 1字节
    pub mint_timestamp: i64,       // 8字节
    pub mint_number: u64,          // 8字节
}

// ========== 错误定义 ==========

#[error_code]
pub enum AchievementError {
    #[msg("Already claimed this achievement")]
    AlreadyClaimed,
}
