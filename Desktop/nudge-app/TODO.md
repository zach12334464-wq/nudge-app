# TODO

- [x] Rebuild `index.html`:
  - [x] Replace hero section content inside `.hero` with the provided HTML snippet
  - [x] Insert metrics strip below the hero
  - [x] Update features section title text
  - [x] Replace all 6 feature cards with the provided Nudge feature names + descriptions
  - [x] Add CSS rules for new hero/metrics elements in the existing `<style>` block

- [x] Update `login.html` completely:
  - [x] Add demo login section markup at the top of the login card (above email input and above divider)
  - [x] Add demo flow JS inside the existing `DOMContentLoaded` script (role param auto-trigger + click handlers + localStorage keys)
  - [x] Add inline CSS rules for the demo login section into the existing `<style>` tag

- [ ] Validate manually:
  - [ ] `index.html` CTAs link to `login.html?role=owner` and `login.html?role=employee`
  - [ ] `login.html?role=owner` immediately sets localStorage + navigates to `owner.html`
  - [ ] `login.html?role=employee` immediately sets localStorage + navigates to `dashboard.html`
  - [ ] OAuth buttons and email/password sign-in/up remain functional


