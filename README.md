# PAMASIS Landing Page + Campaign CMS

This repository contains the public, campaign-independent PAMASIS brand page and a separately authenticated campaign manager.

## Files
- `index.html`: permanent brand story and public featured-campaign slot.
- `campaign-runtime.js`: loads the currently active published/scheduled campaign.
- `campaign-admin.html`: private sign-in and campaign editor.
- `campaign-config.example.js`: browser-safe configuration template.
- `supabase/campaign-cms.sql`: database, row-level security, and media bucket setup.

## Required setup before deployment
1. Create a **dedicated Supabase project for this landing page CMS**. Do not reuse PAMASIS assessment, analytics, or admin databases.
2. In Supabase SQL Editor, replace every `REPLACE_WITH_ADMIN_EMAIL` in `supabase/campaign-cms.sql` with the exact admin email, then run the SQL.
3. In Supabase Auth, create/invite the admin user and **disable public sign-ups**. The UI allowlist is not the security boundary; the database RLS policies are.
4. Copy `campaign-config.example.js` to `campaign-config.js`. Fill in the Supabase project URL, **anon/public key**, and the same admin email.
5. Keep `campaign-config.js` out of GitHub. Never put a Supabase service-role key in browser code.
6. Deploy to a preview URL first. Test admin login, media upload, draft saving, preview, publishing, scheduled start, expiry, and unpublishing before attaching a subdomain.

## Campaign manager
After deployment, open `/campaign-admin.html`. Create campaign copy, add an HTTPS CTA URL, upload image/video artwork, select a layout, and set draft/scheduled/published/archived status and dates. The public page displays the first eligible active campaign. The permanent PAMASIS story remains in place.

## Security
- Row-level security is the database security boundary.
- Admin writes and uploads are restricted by the configured email claim.
- The CMS accepts image/video uploads only; arbitrary scripts are not executed.
- Public campaign links should use trusted HTTPS destinations.
- Use a strong unique admin password and enable MFA in Supabase if available.

## Not launch-ready until verified
- The public landing page still needs the **exact official PAMASIS logo asset** integrated.
- Confirm the WhatsApp number currently embedded in the landing page and verify every social URL.
- Confirm final copy, image rights, privacy notice/analytics approach, and contact details.
- The CMS is source-code complete but **not connected to a real Supabase project or deployed yet**. Do not treat the campaign admin as operational until setup and end-to-end tests pass.
