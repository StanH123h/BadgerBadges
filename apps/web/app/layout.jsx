export const metadata = {
  title: 'BadgerBadge - UW-Madison Achievements',
  description: 'Collect campus achievement NFTs at UW-Madison',
};

export default function RootLayout({ children }) {
  return (
    <html style={{overscrollBehavior:"none"}} lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif'}}>
        <main>
          {children}
        </main>
      </body>
    </html>
  );
}
