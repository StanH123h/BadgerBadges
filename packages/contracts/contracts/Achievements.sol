// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BadgerBadge Achievements
 * @notice NFT contract for UW-Madison campus achievements
 *
 * SECURITY NOTES (MUST FIX BEFORE PRODUCTION):
 * 1. Gas fees: Students need ETH to mint. Consider implementing EIP-2771 meta-transactions
 *    or have backend relay transactions to enable gasless minting.
 * 2. Nonce management: Current implementation uses simple mapping. For production,
 *    consider using incremental nonces per user for better UX.
 * 3. Signature replay: Protected by nonce + deadline + chainId + contract address.
 * 4. Metadata: tokenURI needs to be implemented (IPFS or centralized server).
 */
contract Achievements is ERC721, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ========== STATE VARIABLES ==========

    /// @notice Address authorized to sign mint approvals (backend server)
    address public signer;

    /// @notice Counter for token IDs
    uint256 private _tokenIdCounter;

    /// @notice Base URI for token metadata
    string private _baseTokenURI;

    // Mapping: user address => achievementId => has claimed
    mapping(address => mapping(bytes32 => bool)) public hasClaimed;

    // Mapping: tokenId => achievementId
    mapping(uint256 => bytes32) public tokenAchievements;

    // Mapping: nonce => used (prevents replay attacks)
    // CRITICAL: Nonces must be unique and tracked server-side
    mapping(bytes32 => bool) public usedNonces;

    // ========== EVENTS ==========

    event AchievementMinted(
        address indexed user,
        uint256 indexed tokenId,
        bytes32 indexed achievementId
    );

    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event BaseURIUpdated(string newBaseURI);

    // ========== CONSTRUCTOR ==========

    constructor(
        address _signer,
        string memory baseURI_
    ) ERC721("BadgerBadge Achievement", "BADGE") Ownable(msg.sender) {
        require(_signer != address(0), "Invalid signer");
        signer = _signer;
        _baseTokenURI = baseURI_;
    }

    // ========== MINTING FUNCTIONS ==========

    /**
     * @notice Mint an achievement NFT
     * @param to Address to mint to
     * @param achievementId Achievement identifier (e.g., keccak256("RAINY_DAY_2025"))
     * @param nonce Unique nonce (must be generated server-side and tracked)
     * @param deadline Expiration timestamp (recommend 5-15 minutes from signing)
     * @param signature Backend signature authorizing this mint
     *
     * @dev Security model:
     * - Backend validates eligibility (weather, location, time, etc.)
     * - Backend signs a message with achievementId + nonce + deadline
     * - User submits signature to this function
     * - Contract verifies signature and mints if valid
     *
     * ATTACK VECTORS TO CONSIDER:
     * - User location spoofing: Backend receives lat/lng from client (UNTRUSTED!)
     * - Replay attacks: Prevented by nonce tracking
     * - Signature farming: Prevented by deadline expiration
     */
    function mintAchievement(
        address to,
        bytes32 achievementId,
        bytes32 nonce,
        uint256 deadline,
        bytes memory signature
    ) external {
        // Check deadline
        require(block.timestamp <= deadline, "Signature expired");

        // Check if already claimed
        require(!hasClaimed[to][achievementId], "Already claimed this achievement");

        // Check nonce not used (prevents replay)
        require(!usedNonces[nonce], "Nonce already used");

        // Verify signature
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                to,
                achievementId,
                nonce,
                deadline,
                block.chainid,
                address(this)
            )
        );

        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();
        address recoveredSigner = ethSignedMessageHash.recover(signature);

        require(recoveredSigner == signer, "Invalid signature");

        // Mark nonce as used
        usedNonces[nonce] = true;

        // Mark as claimed
        hasClaimed[to][achievementId] = true;

        // Mint token
        uint256 tokenId = _tokenIdCounter++;
        tokenAchievements[tokenId] = achievementId;

        _safeMint(to, tokenId);

        emit AchievementMinted(to, tokenId, achievementId);
    }

    // ========== VIEW FUNCTIONS ==========

    /**
     * @notice Check if user has claimed a specific achievement
     */
    function hasAchievement(address user, bytes32 achievementId)
        external
        view
        returns (bool)
    {
        return hasClaimed[user][achievementId];
    }

    /**
     * @notice Get achievement ID for a token
     */
    function getAchievementId(uint256 tokenId)
        external
        view
        returns (bytes32)
    {
        require(tokenAchievements[tokenId] != bytes32(0), "Token does not exist");
        return tokenAchievements[tokenId];
    }

    /**
     * @notice Get total number of achievements minted
     */
    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter;
    }

    /**
     * @dev Base URI for computing {tokenURI}
     * TODO: Implement proper metadata hosting (IPFS or centralized API)
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    /**
     * @notice Get token URI
     * TODO: This should return metadata JSON with achievement name, description, image
     * Format: { "name": "...", "description": "...", "image": "ipfs://..." }
     */
    function tokenURI(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        // For now, returns base URI + tokenId
        // PRODUCTION: Should return baseURI + achievementId for consistent metadata
        return super.tokenURI(tokenId);
    }

    // ========== ADMIN FUNCTIONS ==========

    /**
     * @notice Update the authorized signer address
     * @dev Only owner can call this
     */
    function updateSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "Invalid signer");
        address oldSigner = signer;
        signer = newSigner;
        emit SignerUpdated(oldSigner, newSigner);
    }

    /**
     * @notice Update base URI for metadata
     */
    function setBaseURI(string memory newBaseURI) external onlyOwner {
        _baseTokenURI = newBaseURI;
        emit BaseURIUpdated(newBaseURI);
    }
}
