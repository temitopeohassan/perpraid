import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    accountAssociation: {
   "header": "eyJmaWQiOjcwODcwNywidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDQwMTJGRmQzQmE5ZTJiRjY3NDIzNTFEQzJDNDE1NWFDRjBEZjVhZWUifQ",
    "payload": "eyJkb21haW4iOiJ2aWN0b3J5dmF1bHQtbXUudmVyY2VsLmFwcCJ9",
    "signature": "P/THt74idYQ3h+6TyAansbe5SJN39dJoOXPjNbPUWdlFJKWqBQ4qCyQWYOcZX+4W2FdWPPpI1MMM8hSqbv2Dchs="
    },
    frame: {
      version: '1',
      name: 'Victory  Vault',
      iconUrl: 'https://victoryvault-mu.vercel.app/icon.png',
      splashImageUrl: 'https://victoryvault-mu.vercel.app/splash.png',
      splashBackgroundColor: '#FFFFFF',
      homeUrl: 'https://victoryvault-mu.vercel.app/',
      imageUrl: 'https://victoryvault-mu.vercel.app/image.png',
      buttonTitle: 'Start Earning',
      heroImageUrl:
        'https://victoryvault-mu.vercel.app/image.png',
      webhookUrl: 'https://victoryvault-mu.vercel.app/api/webhook',
      subtitle: 'Fair play meets fair pay',
      description: 'Fair play meets fair pay',
      "screenshotUrls": [
      "https://victoryvault-mu.vercel.app/IMG_1.jpg",
      "https://victoryvault-mu.vercel.app/IMG_2.jpg",
      "https://victoryvault-mu.vercel.app/IMG_3.jpg"
    ],
      primaryCategory: 'finance',
     tags: [
      "prediction",
      "earning",
      "claim",
      "earn"
    ],
      tagline: 'Fair play meets fair pay',
      ogTitle: 'Victory  Vault',
        ogDescription: 'Fair play meets fair pay',
      ogImageUrl:
        'https://victoryvault-mu.vercel.app/og-image.png',
      castShareUrl: 'https://victoryvault-mu.vercel.app/',
    },
   baseBuilder: {
    "allowedAddresses": ["0xEdf7eA4b9e224d024D421e97736344FfBe00F8e2"]
    },
  };

  return NextResponse.json(config);
}

export const runtime = 'edge';