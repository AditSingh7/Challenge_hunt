This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Code execution (Codebox)

Submissions can use a separately hosted [Codebox](https://github.com/hiteshchoudhary/Codebox) instance. Deploy Codebox using its Docker Compose production instructions, then set these server-side environment variables for this Next.js app:

- `CODEBOX_URL`: the HTTPS base URL for Codebox, without a trailing slash
- `CODEBOX_AUTH_TOKEN`: the same secret as Codebox's `AUTH_TOKEN`

The app sends C and Java submissions to Codebox with the expected output and awards points only when Codebox reports an accepted result. The token is only read by the server. Submissions fail closed if Codebox is not configured. For local development only, set `LOCAL_CODE_EXECUTION=true` to use the legacy local compiler runner; it does not sandbox submitted programs.

The Codebox service is a separate deployment; the app's Railway or other hosting container should not be assumed to run Codebox's Docker worker stack itself. See [Codebox deployment instructions](https://github.com/hiteshchoudhary/Codebox#running-codebox).

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
