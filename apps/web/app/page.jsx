'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ACHIEVEMENTS } from '@badger/shared';

export default function HomePage() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [claimedAchievements, setClaimedAchievements] = useState(new Set());
  const [testNFTCount, setTestNFTCount] = useState(0);
  const [isMintingTest, setIsMintingTest] = useState(false);

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      alert('Please install MetaMask to use this app!');
      return;
    }

    try {
      setIsConnecting(true);
      const web3Provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await web3Provider.send('eth_requestAccounts', []);
      const signer = await web3Provider.getSigner();

      setProvider(web3Provider);
      setAccount(accounts[0]);

      console.log('Connected:', accounts[0]);

      // Load claimed achievements from blockchain
      await loadClaimedAchievements(accounts[0], web3Provider);
      
      // Load test NFT count
      await loadTestNFTCount(accounts[0], web3Provider);
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  // Load claimed achievements from blockchain
  const loadClaimedAchievements = async (userAccount, web3Provider) => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;
      if (!contractAddress) {
        console.warn('Contract address not configured, skipping claim check');
        return;
      }

      // Import ABI and create contract instance
      const { AchievementsABI } = await import('@badger/shared');
      const contract = new ethers.Contract(contractAddress, AchievementsABI, web3Provider);

      console.log('Loading claimed achievements for', userAccount);
      
      // Check each achievement
      const claimed = new Set();
      for (const achievement of ACHIEVEMENTS) {
        try {
          const achievementIdBytes32 = ethers.id(achievement.id);
          const hasClaimed = await contract.hasAchievement(userAccount, achievementIdBytes32);
          
          if (hasClaimed) {
            claimed.add(achievement.id);
            console.log('✓ Already claimed:', achievement.name);
          }
        } catch (error) {
          console.error(`Error checking achievement ${achievement.id}:`, error);
          // Continue checking other achievements even if one fails
        }
      }

      setClaimedAchievements(claimed);
      console.log(`Loaded ${claimed.size} claimed achievements`);
    } catch (error) {
      console.error('Failed to load claimed achievements:', error);
      // Don't block the UI, just log the error
    }
  };

  // Load test NFT count
  const loadTestNFTCount = async (userAccount, web3Provider) => {
    try {
      const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;
      if (!contractAddress) {
        console.warn('Contract address not configured, skipping test NFT count');
        return;
      }

      const { AchievementsABI } = await import('@badger/shared');
      const contract = new ethers.Contract(contractAddress, AchievementsABI, web3Provider);

      console.log('Loading test NFT count for', userAccount);
      
      // Call testNFTsOwnedBy function
      const count = await contract.testNFTsOwnedBy(userAccount);
      setTestNFTCount(Number(count));
      console.log('Test NFTs owned:', Number(count));
    } catch (error) {
      console.error('Failed to load test NFT count:', error);
      // Don't block the UI, just log the error
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setAccount(null);
    setProvider(null);
    setClaimedAchievements(new Set());
    setTestNFTCount(0);
  };

  // Claim test NFT
  const claimTestNFT = async () => {
    if (!account) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      setIsMintingTest(true);
      console.log('Minting test NFT...');

      // Call backend API to get signature (no location needed for test NFT)
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: account,
          achievementId: 'TEST_BADGE',
          lat: 0, // Dummy values for test NFT
          lng: 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get signature from backend');
      }

      const { signature, nonce, deadline, isTestNFT } = await response.json();

      if (!isTestNFT) {
        throw new Error('Backend did not return test NFT signature');
      }

      // Get contract instance
      const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured. Please deploy contract first.');
      }

      // Import ABI dynamically
      const { AchievementsABI } = await import('@badger/shared');
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, AchievementsABI, signer);

      // Call contract to mint test NFT
      console.log('Calling contract to mint test NFT...');
      const tx = await contract.mintTestNFT(
        account,
        nonce,
        deadline,
        signature
      );

      console.log('Transaction sent:', tx.hash);
      alert(`Transaction submitted! Hash: ${tx.hash}\n\nWaiting for confirmation...`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      alert(`🧪 Test NFT minted successfully!\n\nTransaction: ${tx.hash}`);

      // Update test NFT count
      setTestNFTCount(prev => prev + 1);
    } catch (error) {
      console.error('Failed to mint test NFT:', error);
      alert('Failed to mint test NFT: ' + error.message);
    } finally {
      setIsMintingTest(false);
    }
  };

  // Claim achievement
  const claimAchievement = async (achievement) => {
    if (!account) {
      alert('Please connect your wallet first!');
      return;
    }

    try {
      console.log('Claiming achievement:', achievement.id);

      // Get user's location (for demo purposes)
      // WARNING: This can be spoofed! See validation notes in backend
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude: lat, longitude: lng } = position.coords;

      // Call backend API to get signature
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: account,
          achievementId: achievement.id,
          lat,
          lng,
          // For event-based achievements, you'd also send eventCode
          // eventCode: userInputEventCode,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to get signature from backend');
      }

      const { signature, nonce, deadline } = await response.json();

      // Get contract instance
      const contractAddress = process.env.NEXT_PUBLIC_ACHIEVEMENTS_CONTRACT_ADDRESS;
      if (!contractAddress) {
        throw new Error('Contract address not configured. Please deploy contract first.');
      }

      // Import ABI dynamically
      const { AchievementsABI } = await import('@badger/shared');
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, AchievementsABI, signer);

      // Convert achievementId to bytes32
      const achievementIdBytes32 = ethers.id(achievement.id);

      // Call contract to mint
      console.log('Calling contract to mint...');
      const tx = await contract.mintAchievement(
        account,
        achievementIdBytes32,
        nonce,
        deadline,
        signature
      );

      console.log('Transaction sent:', tx.hash);
      alert(`Transaction submitted! Hash: ${tx.hash}\n\nWaiting for confirmation...`);

      // Wait for confirmation
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt);

      alert(`🎉 Achievement claimed successfully!\n\nTransaction: ${tx.hash}`);

      // Update claimed status
      setClaimedAchievements(prev => new Set([...prev, achievement.id]));
    } catch (error) {
      console.error('Failed to claim achievement:', error);
      alert('Failed to claim achievement: ' + error.message);
    }
  };

  return (
    <div>
      {/* Wallet Connection */}
      <div style={{
        background: '#f5f5f5',
        padding: '1.5rem',
        borderRadius: '8px',
        marginBottom: '2rem',
      }}>
        {!account ? (
          <div>
            <h2 style={{ marginTop: 0 }}>Connect Your Wallet</h2>
            <p style={{ color: '#666', marginBottom: '1rem' }}>
              Connect your wallet to view and claim campus achievements.
            </p>
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              style={{
                background: '#c5050c',
                color: 'white',
                border: 'none',
                padding: '0.75rem 1.5rem',
                borderRadius: '4px',
                fontSize: '1rem',
                cursor: isConnecting ? 'not-allowed' : 'pointer',
                opacity: isConnecting ? 0.6 : 1,
              }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <div>
            <h2 style={{ marginTop: 0 }}>Wallet Connected</h2>
            <p style={{ color: '#666', fontFamily: 'monospace', fontSize: '0.9rem' }}>
              {account}
            </p>
            <button
              onClick={disconnectWallet}
              style={{
                background: '#666',
                color: 'white',
                border: 'none',
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Achievements List */}
      <h2>Available Achievements</h2>
      <p style={{ color: '#666', marginBottom: '2rem' }}>
        Collect NFT badges by completing campus activities and milestones.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '1.5rem',
      }}>
        {ACHIEVEMENTS.map((achievement) => {
          const isClaimed = claimedAchievements.has(achievement.id);
          const isTestNFT = achievement.isTestNFT;

          return (
            <div
              key={achievement.id}
              style={{
                position: 'relative',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                padding: '1.5rem',
                background: isTestNFT ? '#faf5ff' : (isClaimed ? '#f0f9ff' : 'white'),
                opacity: (!isTestNFT && isClaimed) ? 0.7 : 1,
              }}
            >
              {/* Test NFT Badge */}
              {isTestNFT && (
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: '#9333ea',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                }}>
                  x10000
                </div>
              )}

              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                {achievement.icon}
              </div>
              <h3 style={{ marginTop: 0, marginBottom: '0.5rem' }}>
                {achievement.name}
              </h3>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                {achievement.description}
              </p>
              <div style={{
                fontSize: '0.75rem',
                color: '#999',
                textTransform: 'uppercase',
                marginBottom: '1rem',
              }}>
                {achievement.category}
              </div>

              {isTestNFT ? (
                <>
                  {/* Test NFT Counter */}
                  <div style={{
                    background: '#f3e8ff',
                    color: '#9333ea',
                    padding: '0.5rem',
                    borderRadius: '4px',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    marginBottom: '0.75rem',
                    fontWeight: 'bold',
                  }}>
                    Minted: {testNFTCount}/{achievement.maxSupply}
                  </div>
                  
                  <button
                    onClick={claimTestNFT}
                    disabled={!account || isMintingTest}
                    style={{
                      width: '100%',
                      background: account ? (isMintingTest ? '#9333ea80' : '#9333ea') : '#ccc',
                      color: 'white',
                      border: 'none',
                      padding: '0.75rem',
                      borderRadius: '4px',
                      fontSize: '1rem',
                      cursor: (account && !isMintingTest) ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {!account ? 'Connect Wallet to Claim' : (isMintingTest ? 'Minting...' : 'Mint Test NFT')}
                  </button>
                </>
              ) : (
                <>
                  {isClaimed ? (
                    <div style={{
                      background: '#10b981',
                      color: 'white',
                      padding: '0.5rem',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '0.9rem',
                    }}>
                      ✓ Claimed
                    </div>
                  ) : (
                    <button
                      onClick={() => claimAchievement(achievement)}
                      disabled={!account}
                      style={{
                        width: '100%',
                        background: account ? '#c5050c' : '#ccc',
                        color: 'white',
                        border: 'none',
                        padding: '0.75rem',
                        borderRadius: '4px',
                        fontSize: '1rem',
                        cursor: account ? 'pointer' : 'not-allowed',
                      }}
                    >
                      {account ? 'Claim Achievement' : 'Connect Wallet to Claim'}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Section */}
      <div style={{
        marginTop: '3rem',
        padding: '1.5rem',
        background: '#fff9e6',
        border: '2px solid #ffd700',
        borderRadius: '8px',
      }}>
        <h3 style={{ marginTop: 0 }}>⚠️ Important Notes</h3>
        <ul style={{ color: '#666', lineHeight: '1.6' }}>
          <li>Make sure you have some ETH in your wallet to pay for gas fees</li>
          <li>Each regular achievement can only be claimed once per wallet</li>
          <li><strong>🧪 Test:</strong> Can be minted multiple times (up to 10,000 unique NFTs with different colors)</li>
          <li>Location-based achievements require browser location access</li>
          <li>Event-based achievements require a valid event code (contact organizers)</li>
          <li>
            <strong>Security Notice:</strong> This is a demo. Location can be spoofed.
            Production version should use QR codes or other verification methods.
          </li>
        </ul>
      </div>
    </div>
  );
}
