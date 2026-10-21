IN THIS REPO DOING THE MAIN THING 

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the  development server:

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

## Code execution (JDoodle Compiler API)

Submissions use the hosted [JDoodle Compiler API](https://www.jdoodle.com/compiler-api), so the app does not need to host a code execution engine. Set `JDOODLE_CLIENT_ID` and `JDOODLE_CLIENT_SECRET` in the server environment (for local development, use `.env.local`). Never expose the client secret to browser code or commit it to the repository.

The app sends C submissions to GCC 9.1 and Java submissions to JDK 17, then compares program output with the challenge target. The current JDoodle API plan list shows 20 free runs per day and 1,000 daily runs on Starter at $10/month; confirm [current API credits and pricing](https://www.jdoodle.com/docs/api/credits) before the event. For local development without API credentials, set `LOCAL_CODE_EXECUTION=true`; this runs code on the local machine and is not a sandbox for untrusted submissions.

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
