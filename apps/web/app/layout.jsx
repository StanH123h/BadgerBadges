export const metadata = {
  title: 'BadgerBadge - UW-Madison Achievements',
  description: 'Collect campus achievement NFTs at UW-Madison',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        <header style={{
          background: '#c5050c',
          color: 'white',
          padding: '1rem 2rem',
          borderBottom: '3px solid #9b0000',
        }}>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>
            🦡 BadgerBadge
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.9rem', opacity: 0.9 }}>
            UW-Madison Campus Achievements
          </p>
        </header>
        <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}>
          {children}
        </main>
        <footer style={{
          textAlign: 'center',
          padding: '2rem',
          borderTop: '1px solid #eee',
          color: '#666',
          fontSize: '0.875rem',
        }}>
          <p>Built with ❤️ for Badgers | On-chain achievements for campus life</p>
        </footer>
      </body>
    </html>
  );
}
