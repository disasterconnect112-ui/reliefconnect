<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Victims never authenticate: SOS create/track go only through security-definer RPCs (submit_sos, track_request) so anon has no table access.
- Volunteer task state changes and points go through the volunteer_action RPC; a trigger blocks users from editing their own points/role.
- Admin role lives only in user_roles (has_role), never assigned by signup.
- UI strings live in src/lib/i18n.tsx as one row per key across all languages; keep the language order fixed.
- Leaflet is loaded only via React.lazy behind ClientOnly (SSR-safe).
- NGO privileges come only from an admin approving via the approve_ngo RPC; signup always grants volunteer, so self-chosen roles never grant access.
