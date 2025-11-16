// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155Supply.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title BadgerBadge Achievements
 * @notice NFT contract for UW-Madison campus achievements (ERC1155)
 *
 * TOKEN ID STRUCTURE:
 * - Regular achievements: uint256(keccak256(achievementId))
 * - Test NFTs: 10000 - 19999 (10,000 unique test badges)
 *
 * SECURITY NOTES (MUST FIX BEFORE PRODUCTION):
 * 1. Gas fees: Students need ETH to mint. Consider implementing EIP-2771 meta-transactions
 *    or have backend relay transactions to enable gasless minting.
 * 2. Nonce management: Current implementation uses simple mapping. For production,
 *    consider using incremental nonces per user for better UX.
 * 3. Signature replay: Protected by nonce + deadline + chainId + contract address.
 * 4. Metadata: uri() returns API endpoint for dynamic metadata generation.
 */
contract Achievements is ERC1155, ERC1155Supply, Ownable {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;
    using Strings for uint256;

    // ========== STATE VARIABLES ==========

    /// @notice Address authorized to sign mint approvals (backend server)
    address public signer;

    /// @notice Base URI for token metadata
    string private _baseTokenURI;

    /// @notice Test NFT constants
    uint256 private constant TEST_NFT_START_ID = 10000;
    uint256 private constant TEST_NFT_MAX_SUPPLY = 10000;
    uint256 private _testNFTCounter;

    // Mapping: user address => achievementId => has claimed
    mapping(address => mapping(bytes32 => bool)) public hasClaimed;

    // Mapping: tokenId => achievementId (for regular achievements)
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

    event TestNFTMinted(
        address indexed user,
        uint256 indexed tokenId
    );

    event SignerUpdated(address indexed oldSigner, address indexed newSigner);
    event BaseURIUpdated(string newBaseURI);

    // ========== CONSTRUCTOR ==========

    constructor(
        address _signer,
        string memory baseURI_
    ) ERC1155("") Ownable(msg.sender) {
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

        // Convert achievementId to tokenId
        uint256 tokenId = uint256(achievementId);
        tokenAchievements[tokenId] = achievementId;

        // Mint token (amount = 1 for achievements)
        _mint(to, tokenId, 1, "");

        emit AchievementMinted(to, tokenId, achievementId);
    }

    /**
     * @notice Mint a test NFT (repeatable, up to 10,000 unique IDs)
     * @param to Address to mint to
     * @param nonce Unique nonce (must be generated server-side and tracked)
     * @param deadline Expiration timestamp
     * @param signature Backend signature authorizing this mint
     *
     * @dev Test NFTs use token IDs 10000-19999 and can be minted multiple times
     * by the same user. Each mint gets a unique token ID.
     */
    function mintTestNFT(
        address to,
        bytes32 nonce,
        uint256 deadline,
        bytes memory signature
    ) external {
        // Check deadline
        require(block.timestamp <= deadline, "Signature expired");

        // Check nonce not used (prevents replay)
        require(!usedNonces[nonce], "Nonce already used");

        // Check supply limit
        require(_testNFTCounter < TEST_NFT_MAX_SUPPLY, "Test NFT supply exhausted");

        // Verify signature (for test NFT, use special marker)
        bytes32 testNFTMarker = keccak256("TEST_NFT");
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                to,
                testNFTMarker,
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

        // Assign next test NFT ID
        uint256 tokenId = TEST_NFT_START_ID + _testNFTCounter;
        _testNFTCounter++;

        // Mint token (amount = 1)
        _mint(to, tokenId, 1, "");

        emit TestNFTMinted(to, tokenId);
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
        // Only regular achievements have achievementId mapping
        require(tokenId < TEST_NFT_START_ID, "Not a regular achievement");
        require(tokenAchievements[tokenId] != bytes32(0), "Token does not exist");
        return tokenAchievements[tokenId];
    }

    /**
     * @notice Check if a token ID is a test NFT
     */
    function isTestNFT(uint256 tokenId) public pure returns (bool) {
        return tokenId >= TEST_NFT_START_ID && tokenId < TEST_NFT_START_ID + TEST_NFT_MAX_SUPPLY;
    }

    /**
     * @notice Get the total number of test NFTs minted
     */
    function testNFTsMinted() external view returns (uint256) {
        return _testNFTCounter;
    }

    /**
     * @notice Get the number of test NFTs owned by an address
     */
    function testNFTsOwnedBy(address owner) external view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < _testNFTCounter; i++) {
            uint256 tokenId = TEST_NFT_START_ID + i;
            if (balanceOf(owner, tokenId) > 0) {
                count++;
            }
        }
        return count;
    }

    /**
     * @notice Get token URI for ERC1155
     * Returns: baseURI + tokenId
     * Backend should serve metadata at this URL
     */
    function uri(uint256 tokenId)
        public
        view
        override
        returns (string memory)
    {
        return string(abi.encodePacked(_baseTokenURI, tokenId.toString()));
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

    // ========== OVERRIDES ==========

    /**
     * @dev Override required by Solidity for multiple inheritance
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal override(ERC1155, ERC1155Supply) {
        super._update(from, to, ids, values);
    }
}
