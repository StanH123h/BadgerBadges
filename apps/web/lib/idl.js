// Achievements Program IDL
// 简化版IDL，用于前端调用

export const ACHIEVEMENTS_IDL = {
  version: "0.1.0",
  name: "achievements",
  instructions: [
    {
      name: "claimAchievement",
      accounts: [
        {
          name: "achievementState",
          isMut: true,
          isSigner: false
        },
        {
          name: "userAchievement",
          isMut: true,
          isSigner: false
        },
        {
          name: "user",
          isMut: true,
          isSigner: true
        },
        {
          name: "systemProgram",
          isMut: false,
          isSigner: false
        }
      ],
      args: [
        {
          name: "achievementId",
          type: "string"
        }
      ]
    }
  ],
  accounts: [
    {
      name: "AchievementState",
      type: {
        kind: "struct",
        fields: [
          {
            name: "authority",
            type: "publicKey"
          },
          {
            name: "backendSigner",
            type: "publicKey"
          },
          {
            name: "totalMinted",
            type: "u64"
          }
        ]
      }
    },
    {
      name: "UserAchievement",
      type: {
        kind: "struct",
        fields: [
          {
            name: "user",
            type: "publicKey"
          },
          {
            name: "achievementId",
            type: "string"
          },
          {
            name: "isClaimed",
            type: "bool"
          },
          {
            name: "mintTimestamp",
            type: "i64"
          },
          {
            name: "mintNumber",
            type: "u64"
          }
        ]
      }
    }
  ]
};
