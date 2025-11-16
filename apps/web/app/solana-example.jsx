/**
 * Solana version achievements claim page example
 *
 * Using Phantom Wallet + @solana/web3.js
 */

'use client';

import { useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  createConnection,
  getProgramId,
  mintAchievement,
  hasUserClaimed,
} from '../lib/shared/solana-client';
import { ACHIEVEMENTS } from '../lib/shared';

export default function SolanaAchievementsPage() {
  const [wallet, setWallet] = useState(null);
  const [network] = useState('devnet'); // or 'localnet'
  const [connection, setConnection] = useState(null);
  const [claiming, setClaiming] = useState(false);

  // ========== WALLET CONNECTION ==========

  useEffect(() => {
    setConnection(createConnection(network));
  }, [network]);

  const connectWallet = async () => {
    try {
      // Check Phantom wallet
      const { solana } = window;

      if (!solana?.isPhantom) {
        alert('Please install Phantom Wallet! https://phantom.app/');
        return;
      }

      // Connect wallet
      const response = await solana.connect();
      console.log('Connected to wallet:', response.publicKey.toString());

      setWallet({
        publicKey: response.publicKey,
        signTransaction: solana.signTransaction.bind(solana),
        signAllTransactions: solana.signAllTransactions.bind(solana),
      });
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      alert('Failed to connect wallet: ' + error.message);
    }
  };

  const disconnectWallet = () => {
    if (window.solana) {
      window.solana.disconnect();
    }
    setWallet(null);
  };

  // ========== CLAIM ACHIEVEMENT ==========

  const handleClaim = async (achievementId) => {
    if (!wallet) {
      alert('Please connect Phantom Wallet first!');
      return;
    }

    setClaiming(true);

    try {
      // 1. Check if already claimed
      const programId = getProgramId(network);
      const alreadyClaimed = await hasUserClaimed(
        connection,
        wallet.publicKey,
        achievementId,
        programId
      );

      if (alreadyClaimed) {
        alert('You have already claimed this achievement!');
        setClaiming(false);
        return;
      }

      // 2. Get user location (if needed)
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });

      const { latitude, longitude } = position.coords;

      // 3. Call backend API to validate and get signature
      const response = await fetch('/api/claim-solana', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          achievementId,
          userPubkey: wallet.publicKey.toString(),
          latitude,
          longitude,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        alert('Validation failed: ' + data.error);
        setClaiming(false);
        return;
      }

      const { nonce, deadline, signature } = data;

      // 4. Call Solana program to mint NFT
      console.log('🚀 Minting achievement NFT...');

      const result = await mintAchievement(
        connection,
        wallet,
        achievementId,
        nonce,
        deadline,
        signature,
        programId
      );

      console.log('✅ Achievement minted!');
      console.log('Transaction:', result.transaction);
      console.log('Mint:', result.mint);

      alert(`Achievement claimed successfully! 🎉\n\nMint: ${result.mint}\n\nTx: ${result.transaction}`);

      // 5. Refresh page state
      // TODO: Update UI to show claimed

    } catch (error) {
      console.error('Claim failed:', error);
      alert('Claim failed: ' + error.message);
    } finally {
      setClaiming(false);
    }
  };

  // ========== REQUEST AIRDROP (for testing) ==========

  const requestAirdrop = async () => {
    if (!wallet || !connection) return;

    try {
      console.log('Requesting airdrop...');
      const signature = await connection.requestAirdrop(
        wallet.publicKey,
        1e9 // 1 SOL
      );

      await connection.confirmTransaction(signature);
      alert('Airdrop successful! Received 1 SOL');
    } catch (error) {
      console.error('Airdrop failed:', error);
      alert('Airdrop failed (may have reached daily limit)');
    }
  };

  // ========== RENDER ==========

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-900 to-red-700 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">
            🦡 BadgerBadge Achievements
          </h1>
          <p className="text-xl text-red-100">
            UW-Madison Campus Achievement System (Solana Version)
          </p>
          <p className="text-sm text-red-200 mt-2">
            Network: {network.toUpperCase()}
          </p>
        </header>

        {/* Wallet Section */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          {!wallet ? (
            <button
              onClick={connectWallet}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-lg transition"
            >
              Connect Phantom Wallet
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Wallet Connected</p>
                  <p className="font-mono text-sm">
                    {wallet.publicKey.toString().slice(0, 8)}...
                    {wallet.publicKey.toString().slice(-8)}
                  </p>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded"
                >
                  Disconnect
                </button>
              </div>

              {network === 'devnet' && (
                <button
                  onClick={requestAirdrop}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
                >
                  Request Test SOL (Devnet Airdrop)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Achievements Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {ACHIEVEMENTS.map((achievement) => (
            <div
              key={achievement.id}
              className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition"
            >
              <div className="text-center mb-4">
                <div className="text-6xl mb-2">{achievement.icon}</div>
                <h3 className="text-2xl font-bold text-gray-800">
                  {achievement.name}
                </h3>
                <p className="text-gray-600 mt-2">{achievement.description}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
                  {achievement.category}
                </span>
              </div>

              <button
                onClick={() => handleClaim(achievement.id)}
                disabled={claiming || !wallet}
                className={`w-full py-3 rounded-lg font-bold text-white transition ${
                  claiming || !wallet
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {claiming ? 'Claiming...' : wallet ? 'Claim Achievement' : 'Connect Wallet First'}
              </button>
            </div>
          ))}
        </div>

        {/* Info Footer */}
        <footer className="mt-12 text-center text-white text-sm">
          <p>
            💡 Tip: Transaction fees on Solana are approximately $0.0001, almost free!
          </p>
          <p className="mt-2">
            Need help? Check out{' '}
            <a
              href="https://docs.solana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Solana Documentation
            </a>
          </p>
        </footer>
      </div>
    </div>
  );
}
