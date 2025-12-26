import { NextResponse } from 'next/server';

export async function GET() {
  const config = {
    accountAssociation: {
   "header": "eyJmaWQiOjcwODcwNywidHlwZSI6ImN1c3RvZHkiLCJrZXkiOiIweDQwMTJGRmQzQmE5ZTJiRjY3NDIzNTFEQzJDNDE1NWFDRjBEZjVhZWUifQ",
    "payload": "eyJkb21haW4iOiJwZXJwcmFpZC52ZXJjZWwuYXBwIn0",
    "signature": "OmrQTo7vYzs/1azzx2fGxtBkBIsPV923KRKzivfFYC8WVJKWrpfRbCzfGltd92uU6BDRKi+SG5QQeFD08NAomRs="
    },
    frame: {
      version: '1',
      name: 'Perp Raid',
      iconUrl: 'https://perpraid.vercel.app/icon.png',
      splashImageUrl: 'https://perpraid.vercel.app/splash.png',
      splashBackgroundColor: '#FFFFFF',
      homeUrl: 'https://perpraid.vercel.app/',
      imageUrl: 'https://perpraid.vercel.app/image.png',
      buttonTitle: 'Start Raiding',
      heroImageUrl:
        'https://perpraid.vercel.app/image.png',
      webhookUrl: 'https://perpraid.vercel.app/api/webhook',
      subtitle: 'Enter fast. Exit rich.',
      description: 'The prime standard for trading PERPS',
      "screenshotUrls": [
      "https://perpraid.vercel.app/IMG_1.jpg",
      "https://perpraid.vercel.app/IMG_2.jpg",
      "https://perpraid.vercel.app/IMG_3.jpg"
    ],
      primaryCategory: 'finance',
     tags: [
      "trading",
      "perps",
      "fast",
      "earn"
    ],
      tagline: 'Enter fast. Exit rich.',
      ogTitle: 'Perp Raid',
        ogDescription: 'The prime standard for trading PERPS.',
      ogImageUrl:
        'https://perpraid.vercel.app/og-image.png',
      castShareUrl: 'https://perpraid.vercel.app/',
    },
   baseBuilder: {
    "allowedAddresses": ["0xEdf7eA4b9e224d024D421e97736344FfBe00F8e2"]
    },
  };

  return NextResponse.json(config);
}

export const runtime = 'edge';