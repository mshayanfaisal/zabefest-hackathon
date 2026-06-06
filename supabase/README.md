# KarachiPulse — Backend (Supabase)

Hosted Supabase project: Postgres + PostGIS, Auth (anonymous + email/password),
Storage, Realtime, and one Edge Function for AI severity scoring.

## One-time setup

1. **Create project** at https://supabase.com (free tier). Note the Project URL,
   `anon` key, and `service_role` key (Settings → API).

2. **Auth config** (Authentication → Providers / Settings):
   - Enable **Anonymous sign-ins**.
   - Enable **Email** (password) for admins.
   - (Optional) Enable **Phone** for the optional citizen trust-boost.

3. **Schema:** open the SQL editor and run `migrations/001_initial_schema.sql`.

4. **Storage:** create a **public** bucket named `report-photos`
   (Storage → New bucket → Public). Add policies:
   ```sql
   create policy "report_photos_read"   on storage.objects for select using (bucket_id = 'report-photos');
   create policy "report_photos_insert" on storage.objects for insert with check (bucket_id = 'report-photos' and auth.uid() is not null);
   ```

5. **Seed demo data:** run `seed.sql` in the SQL editor.

6. **Admin account:** create an email/password user (Authentication → Users → Add user),
   then insert their id into `admin_profiles`:
   ```sql
   insert into admin_profiles (id, full_name, department, role)
   values ('<that-user-uuid>', 'Demo Admin', 'KMC', 'superadmin');
   ```

## Edge Function — AI severity scoring (Gemini)

Requires the Supabase CLI (`supabase` is installed) and a Gemini API key
(https://aistudio.google.com/apikey).

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase secrets set GEMINI_KEY=<your-gemini-key>
supabase functions deploy score-report
```

Test:
```bash
supabase functions invoke score-report --no-verify-jwt \
  --body '{"report_id":"<an-existing-report-uuid>","description":"huge pothole","category":"infrastructure","sub_type":"pothole"}'
```

The mobile app calls this fire-and-forget after each insert. If it fails or the key
is missing, the rule-based severity default from `prepare_report()` stands, so the
admin queue is never blank.

## Notes
- `prepare_report()` BEFORE-INSERT trigger does: per-device rate limit (5/hour),
  rule-based severity fallback, and 100 m / 1 h geo-dedup (flags `status='duplicate'`).
- `bump_verification()` AFTER-INSERT trigger on `verifications` is the single source of
  truth for `verification_count` and auto-promotes `pending → verified` at 3 confirmations.
