

# Diagnosis: YouTube player not rendering

## Root cause

**Not a code bug.** The only event with `youtube_url` filled has a YouTube **channel** URL (`https://www.youtube.com/@Prof.SandroMesquita`), not a video URL. The `extractYouTubeId` function correctly returns `null` for channel URLs.

## Fix: Minor cleanup only

### File: `src/pages/EventDetail.tsx`

1. **Remove unnecessary type casts** on lines 96-97. The `Event` type (`Tables<"events">`) already includes `youtube_url`, `meet_url`, and `access_url` as `string | null`.

Change:
```ts
const meetUrl = event?.meet_url as string | null;
const youtubeUrl = event?.youtube_url as string | null;
```
To:
```ts
const meetUrl = event?.meet_url;
const youtubeUrl = event?.youtube_url;
```

2. No other code changes needed. The `extractYouTubeId` function and rendering logic are correct.

## Action required (not code)

Update the event's `youtube_url` in the admin panel to an actual video URL (e.g., `https://www.youtube.com/watch?v=VIDEO_ID`) instead of a channel URL. The player will then render correctly.

