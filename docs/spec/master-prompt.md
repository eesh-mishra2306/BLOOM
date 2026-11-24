# MASTER BUILD PROMPT — BLOOM
## Build a World-Class AI-Powered Women's Safety, Wellness & Companion Platform

### YOUR ROLE

You are an elite multidisciplinary product development team consisting of:

- Principal Full-Stack Software Architect
- Senior AI/ML Engineer
- Award-Winning UI/UX Designer
- Creative 3D WebGL Engineer
- Mobile Application Engineer
- Cybersecurity and Privacy Architect
- Women's Reproductive Health Product Specialist
- Accessibility Engineer
- DevOps and Cloud Infrastructure Engineer
- Quality Assurance and Automated Testing Engineer

Your mission is to architect, design, develop, test, and prepare for deployment a beautiful, technically sophisticated, fully functional application called **BLOOM**.

This must feel like a premium consumer application created by an exceptional startup with a world-class design and engineering team.

Do not create a generic dashboard, a collection of placeholder pages, or a shallow prototype masquerading as a completed product.

Build a coherent, reliable, accessible, secure, highly interactive product with meaningful features and excellent performance.

---

# 1. CORE PRODUCT PHILOSOPHY

BLOOM combines five major pillars:

1. Women's personal safety and emergency assistance.
2. Menstrual, reproductive, and hormonal wellness.
3. An emotionally intelligent, adorable AI companion.
4. Evidence-based health and sexual wellness education.
5. Personalized self-care, community, and lifestyle support.

The application should feel like a caring, trustworthy friend rather than a clinical hospital portal.

Design principles:

- Emotionally comforting.
- Vibrant yet sophisticated.
- Extremely fluid interactions.
- Beautiful but never distracting during emergencies.
- Privacy-first by architecture.
- Inclusive and nonjudgmental.
- Medically responsible.
- Delightful without sacrificing functionality.
- Highly customizable.
- Accessible across devices and abilities.

Every interaction should communicate warmth, trust, comfort, and confidence.

---

# 2. VISUAL DESIGN — EXTREME PREMIUM EXPERIENCE

## Design language

Create a unique visual language called:

**Bloom Liquid Petal Design System**

The interface should combine:

- Premium 3D product design.
- Liquid-glass surfaces.
- Organic floral elements.
- Fluid page transitions.
- Soft cinematic lighting.
- Gentle depth and parallax.
- Sophisticated microinteractions.
- Expressive typography.
- Subtle spring-based animations.
- Immersive but controlled visual storytelling.

Avoid the appearance of standard AI-generated SaaS dashboards.

## Color palette

Primary colors:

- Bloom Pink: #FF4F91
- Rose Red: #E83F65
- Soft Blush: #FFF0F5
- Cherry Coral: #FF667A
- Petal Pink: #FFB8D0
- Cream White: #FFF9F7
- Deep Berry: #66263F
- Lavender Mist: #EADCF8

Use thoughtful gradients, soft shadows, transparency, and warm lighting.

Provide light mode, dark mode, reduced-motion mode, and a discreet privacy theme.

## Background environment

Create a delicate animated floral world.

Include:

- Small softly blurred flowers floating behind interface layers.
- Semi-transparent petals drifting slowly.
- Depth-aware particles.
- Organic 3D floral sculptures.
- Subtle light reflections.
- Beautiful gradient backgrounds.
- Responsive parallax.
- Optional cursor-reactive floral motion.

Background effects must never interfere with readability or accessibility.

## Motion and transitions

Use GSAP, Framer Motion/Motion, Lenis where appropriate, and React Three Fiber with Three.js.

Implement:

- Smooth spring-based navigation.
- Liquid card expansion.
- 3D card tilt.
- Shared-element transitions.
- Magnetic interactive controls.
- Subtle hover physics.
- Fluid drag gestures.
- Animated tab morphing.
- Soft page reveal effects.
- Scroll-linked animations.
- Organic shape transformations.
- Animated progress rings.
- Responsive floating navigation.

Target 60 FPS on capable devices.

Use GPU-friendly transforms and opacity. Avoid unnecessary layout recalculations.

Implement adaptive effects for lower-powered devices and respect `prefers-reduced-motion`.

Animation must improve usability, not make the application slow or difficult to operate.

---

# 3. THE BLOOM AI COMPANION

Create the signature feature of the entire platform.

## Companion concept

An adorable, customizable, animated 3D companion.

Users can select:

- Mochi — a tiny fluffy kitten.
- Coco — an affectionate puppy.
- Bubbles — a playful bunny.
- Peaches — a tiny baby bear.
- Custom companion options.

Each companion must have its own personality, voice options, animations, and emotional expressions.

Companions should be visually expressive and feel alive.

## Companion animation system

Include:

- Blinking.
- Breathing.
- Tail wagging.
- Ear movement.
- Sleeping.
- Happy bouncing.
- Gentle waving.
- Curious head tilts.
- Comforting expressions.
- Playful idle animations.
- Reactive facial expressions.

Use optimized 3D assets with glTF/GLB, skeletal animation where appropriate, and lazy loading.

Do not depend on copyrighted characters or unlicensed assets.

## AI capabilities

Integrate a production-quality LLM through a secure backend.

The companion should support:

- Natural conversation.
- Context-aware replies.
- Optional user-approved memory.
- Mood check-ins.
- Gentle emotional support.
- Personalized wellness suggestions.
- Cycle-aware conversations when permission is granted.
- Educational health explanations.
- Stress management exercises.
- Breathing exercises.
- Guided journaling.
- Daily encouragement.
- Voice conversation.
- Multilingual support, including English and Hindi.
- Optional Hinglish conversational style.

Example:

User: "Mochi, my cramps are really bad today."

Mochi: "Oh no, that sounds really uncomfortable. Want to try a warm compress together? I can also help you check which symptoms might need medical attention."

Responses should be warm, natural, supportive, and medically responsible.

## AI safety requirements

The AI must:

- Never claim to be a human or licensed clinician.
- Never diagnose PCOS, pregnancy, or other medical conditions.
- Clearly distinguish general information from medical advice.
- Recognize urgent symptoms and recommend appropriate care.
- Avoid fabricated medical claims.
- Provide evidence-backed educational content.
- Respect consent and user privacy.
- Never encourage emotional dependence.
- Never pressure users into engagement.
- Provide crisis escalation guidance where appropriate.

Include retrieval-augmented generation using reviewed medical resources and visible source references.

## Companion personalization

Allow users to customize:

- Name.
- Appearance.
- Accessories.
- Voice.
- Language.
- Personality style.
- Animation intensity.
- Notification frequency.
- Conversation memory.

The companion should remain optional throughout the application.

---

# 4. ADVANCED MENSTRUAL HEALTH TRACKING

Create a comprehensive menstrual wellness module.

## Period calendar

Features:

- Daily cycle tracking.
- Period start/end logging.
- Flow intensity tracking.
- Cramp severity tracking.
- Mood tracking.
- Symptom logging.
- Cycle history.
- Cycle length analytics.
- Irregular cycle detection.
- Personal notes.
- Custom reminders.
- Medication reminders.
- Exportable health summaries.

## Cycle visualization

Create an elegant interactive calendar with:

- Beautiful animated date selection.
- Smooth month transitions.
- Color-coded period days.
- Predicted cycle windows.
- Symptom overlays.
- Historical comparisons.
- Customizable timeline visualizations.

## Prediction engine

Develop a personalized cycle prediction system.

Begin with transparent, validated statistical methods and improve using longitudinal data where appropriate.

Show uncertainty ranges and prediction confidence.

Never represent predicted ovulation or fertile windows as medically reliable contraception.

For irregular cycles, communicate reduced prediction reliability.

## Advanced insights

Show:

- Average cycle length.
- Cycle variability.
- Typical symptom patterns.
- Mood trends.
- Sleep correlations.
- Cramp patterns.
- Flow patterns.
- Long-term trends.

All insights must be understandable and non-alarming.

---

# 5. PCOS / PCOD SUPPORT CENTER

Create a dedicated PCOS wellness experience.

Explain that PCOD is a term used in some regions and that PCOS is the more standardized clinical term.

Include:

- PCOS educational resources.
- Symptom journaling.
- Irregular cycle tracking.
- Acne tracking.
- Hair-related symptom tracking.
- Weight changes, optionally.
- Sleep tracking.
- Energy tracking.
- Exercise tracking.
- Medication adherence reminders.
- Clinician appointment preparation.
- Lab-result journaling.
- Personalized question lists for doctors.

Create an AI-assisted symptom summary that users can export for medical appointments.

The system must never diagnose PCOS from self-reported symptoms.

Include clinically reviewed explanations about treatment options and when professional assessment is appropriate.

---

# 6. WOMEN'S SAFETY — BLOOM SHIELD

This is a mission-critical subsystem.

Build safety features with reliability and privacy as the highest priorities.

## Emergency SOS

Include:

- Large accessible SOS control.
- Configurable emergency activation.
- Trusted contact alerts.
- Location sharing with explicit consent.
- Emergency call shortcut.
- Emergency information screen.
- Configurable cancellation period.
- Clear delivery and failure status.

Never claim an alert was delivered without confirmation.

For India, provide the official 112 emergency calling option, while supporting country-specific emergency configurations elsewhere.

## Trusted circle

Users can create a private network of trusted people.

Features:

- Invitation and consent flow.
- Trusted contact management.
- Temporary live-location sharing.
- Journey check-ins.
- Scheduled arrival confirmation.
- Missed check-in notifications.
- Explicit sharing expiration.
- Location access revocation.

## Safe journey mode

Create an interactive journey safety feature.

Users can:

1. Select a destination.
2. Choose trusted contacts.
3. Start a time-limited safety session.
4. Share their journey status.
5. Check in during travel.
6. Confirm safe arrival.

If a check-in is missed, use a transparent escalation process with user-configured rules.

Do not claim autonomous emergency dispatch.

## Discreet mode

Create a privacy-preserving interface that can quickly hide sensitive information.

Include:

- Quick-exit button.
- Neutral application appearance.
- Sensitive notification suppression.
- App lock.
- Session timeout.
- Clear privacy controls.

Do not market these features as guaranteeing safety from someone with access to the user's device.

## Additional safety tools

- Emergency preparedness guides.
- Optional evidence journaling with encryption.
- Emergency contact information.
- Safety education.
- Location permission auditing.
- Privacy checkup.
- Emergency accessibility settings.

Do not add hidden surveillance, covert recording, or tracking without informed consent.

---

# 7. SEXUAL AND REPRODUCTIVE HEALTH EDUCATION

Build a medically reviewed, nonjudgmental learning center.

Topics:

- Menstrual anatomy.
- Puberty.
- Consent and boundaries.
- Sexual health.
- Contraception.
- STI awareness.
- Pregnancy basics.
- Reproductive anatomy.
- Vaginal health.
- Hygiene myths.
- Hormonal changes.
- Painful periods.
- Endometriosis awareness.
- PCOS.
- Menopause.
- Common health misconceptions.

Create beautifully illustrated interactive learning cards.

Add quizzes, myth-versus-fact experiences, glossary definitions, and source citations.

Use age-appropriate educational presentation and avoid unsupported medical claims.

---

# 8. EMOTIONAL WELLNESS AND SELF-CARE

Create a comforting wellness environment.

Features:

- Daily mood check-ins.
- Guided breathing.
- Mindfulness exercises.
- Gratitude journaling.
- Sleep routines.
- Stress-management exercises.
- Self-care planning.
- Gentle habit tracking.
- Reflection prompts.
- Custom wellness goals.

## AI wellness insights

With explicit user permission, the companion may identify patterns such as:

"You've reported feeling tired around this point in your cycle several times. Would you like to review your sleep and symptom history?"

Avoid unsupported causal conclusions.

Do not frame normal emotional experiences as medical disorders.

---

# 9. SOOTHING MUSIC AND AUDIO

Build an immersive optional sound environment.

Include original or properly licensed ambient soundscapes:

- Gentle rainfall.
- Forest ambience.
- Ocean waves.
- Soft instrumental ambience.
- White noise.
- Guided relaxation.
- Breathing sound cues.

Audio must be opt-in and respect browser autoplay restrictions.

## Spotify integration

Use official Spotify OAuth and supported APIs.

Features may include:

- Account connection.
- Playlist discovery.
- Playlist selection.
- Open-in-Spotify controls.
- Playback controls where authorized and supported.

Respect Spotify subscription, device, and API restrictions.

Never bypass DRM or download protected music.

Also provide a standalone ambient sound engine that works without Spotify.

Audio should automatically pause or lower during emergency interactions and voice conversations.

---

# 10. PERSONALIZED HOME EXPERIENCE

Create a stunning animated home screen.

Include:

- Personalized greeting.
- Companion greeting.
- Cycle overview.
- Mood check-in.
- Daily wellness tip.
- Quick safety controls.
- Upcoming reminders.
- Ambient audio controls.
- Personalized educational content.
- Daily reflection.

Example:

"Good morning, sunshine 🌸"

"Your next period may begin in approximately 5 days."

"Mochi is here if you want to talk."

Keep the interface calming, beautiful, and informative.

---

# 11. ADDITIONAL DIFFERENTIATING FEATURES

## Bloom Garden

Create a beautiful optional 3D virtual garden.

Users can grow flowers by completing self-selected wellness activities.

Do not penalize users for missing activities.

Avoid manipulative streak mechanics.

## Bloom Journal

Private journaling with:

- Rich text.
- Mood association.
- Optional voice notes.
- Encrypted storage.
- Search.
- Export.
- Deletion controls.

## Doctor Visit Assistant

Help users prepare for medical appointments.

Generate:

- Symptom timelines.
- Cycle summaries.
- Medication lists.
- Questions for clinicians.
- Downloadable PDF summaries.

## Wellness Pattern Explorer

Create visual analytics that correlate logged wellness data without implying causation.

## Accessibility Companion

Offer:

- Screen-reader-friendly UI.
- Voice navigation where feasible.
- Large text.
- High contrast.
- Reduced animation.
- Keyboard navigation.
- Accessible emergency controls.

## Privacy Center

Create a central interface for managing:

- AI memory.
- Health data.
- Location permissions.
- Third-party integrations.
- Export requests.
- Data deletion.
- Consent history.

---

# 12. RECOMMENDED TECHNOLOGY STACK

## Frontend

- Next.js with App Router.
- TypeScript.
- React.
- Tailwind CSS.
- shadcn/ui as a foundation, heavily customized.
- Motion / Framer Motion.
- GSAP.
- Lenis where beneficial.
- Three.js.
- React Three Fiber.
- Drei.
- Zustand.
- TanStack Query.
- React Hook Form.
- Zod.

## Backend

- Node.js / TypeScript.
- Next.js API routes or a dedicated NestJS backend.
- PostgreSQL.
- Prisma ORM.
- Redis for appropriate transient workloads.
- Secure object storage.
- Background job processing.
- WebSockets or managed realtime infrastructure where justified.

## AI infrastructure

- Secure server-side LLM gateway.
- Provider abstraction for OpenAI, Anthropic, or Gemini.
- Retrieval-augmented generation.
- Curated and reviewed medical knowledge base.
- Embeddings and vector search.
- Structured outputs.
- Tool calling with strict permission boundaries.
- Optional speech-to-text and text-to-speech.
- Consent-based long-term memory.

AI must not have unrestricted access to health records, location, contacts, or emergency actions.

## Mobile strategy

Build the web application as a responsive PWA.

Evaluate Capacitor or a dedicated React Native application for mobile-specific functionality.

Clearly distinguish what works in a browser from capabilities requiring native permissions or background execution.

Never pretend that a browser-only application can guarantee background GPS, emergency delivery, or continuous monitoring.

---

# 13. SECURITY AND PRIVACY

Treat health, location, and safety information as highly sensitive.

Implement:

- Strong authentication.
- Optional passkeys.
- Secure session management.
- Multi-factor authentication.
- Role-based authorization.
- Server-side permission checks.
- Encryption in transit.
- Encryption at rest.
- Appropriate application-level encryption for sensitive data.
- Rate limiting.
- Audit logging without exposing sensitive content.
- Input validation.
- CSRF and XSS protections.
- Secure secret management.
- Minimal data retention.
- Explicit opt-in consent.
- Account deletion.
- Data export.
- Third-party permission revocation.

Use data minimization by default.

Do not send private medical information to analytics, advertising systems, or external AI providers without clear disclosure and appropriate consent.

Review applicable Indian privacy requirements, including the DPDP framework, and other laws relevant to deployment regions.

Do not claim legal compliance or medical certification without verification.

---

# 14. DESIGN THE COMPLETE APPLICATION

Build these routes:

- `/` — immersive landing page.
- `/onboarding` — beautiful onboarding experience.
- `/auth` — authentication.
- `/dashboard` — personalized home.
- `/companion` — animated AI friend.
- `/cycle` — menstrual tracker.
- `/pcos` — PCOS wellness center.
- `/safety` — Bloom Shield.
- `/journey` — journey safety session.
- `/learn` — health education.
- `/journal` — private journal.
- `/wellness` — self-care hub.
- `/garden` — interactive 3D garden.
- `/music` — audio experience.
- `/insights` — personalized analytics.
- `/settings` — customization.
- `/privacy` — data and consent management.

Provide consistent navigation, responsive layouts, meaningful empty states, loading states, error states, and functional controls.

---

# 15. PERFORMANCE REQUIREMENTS

Optimize for real-world mobile devices.

Targets:

- Excellent Core Web Vitals.
- Responsive touch interactions.
- Smooth animations on supported hardware.
- Lazy-loaded 3D scenes.
- Compressed optimized assets.
- Reduced bundle sizes.
- Minimal layout shift.
- Graceful degradation.
- Reliable offline behavior for supported features.

Use adaptive rendering quality for 3D effects.

Do not prioritize visual spectacle over emergency accessibility or battery life.

---

# 16. TESTING AND QUALITY ASSURANCE

Include:

- Unit tests.
- Integration tests.
- End-to-end tests.
- Authentication tests.
- Authorization tests.
- Privacy and consent tests.
- Emergency workflow tests.
- Accessibility tests.
- Responsive layout tests.
- AI safety evaluations.
- Performance profiling.
- Error recovery testing.

Test safety-critical workflows under:

- No internet.
- Denied location permission.
- Expired sessions.
- Failed notifications.
- Incorrect contact information.
- Low battery.
- Interrupted browser sessions.
- Background execution restrictions.

Show accurate failure messages and fallback instructions.

---

# 17. DEVELOPMENT EXECUTION PLAN

Work in structured phases.

### Phase 1 — Product architecture

Define:

- Product requirements.
- User journeys.
- Information architecture.
- System architecture.
- Database schema.
- Privacy threat model.
- Technical constraints.
- Feature dependencies.
- Acceptance criteria.

### Phase 2 — Design system

Implement:

- Color tokens.
- Typography.
- Spacing.
- Layout primitives.
- Glass components.
- Animation primitives.
- Floral background system.
- Navigation system.
- Accessibility variants.

### Phase 3 — Core application

Build:

- Authentication.
- Onboarding.
- Dashboard.
- User settings.
- Cycle tracker.
- Health journal.
- Educational content.

### Phase 4 — AI companion

Implement:

- Companion UI.
- 3D mascot.
- Chat backend.
- Streaming responses.
- Voice features where supported.
- Optional memory.
- Medical safety guardrails.
- Knowledge retrieval.

### Phase 5 — Safety infrastructure

Implement and test:

- SOS workflows.
- Trusted circle.
- Journey sessions.
- Location permissions.
- Notification delivery.
- Failure handling.
- Emergency fallback.

### Phase 6 — Premium features

Implement:

- PCOS center.
- Bloom Garden.
- Wellness analytics.
- Spotify integration.
- Audio engine.
- Doctor summaries.
- Additional companion personalization.

### Phase 7 — Production hardening

Perform:

- Security review.
- Accessibility audit.
- Performance optimization.
- End-to-end testing.
- Documentation.
- Deployment preparation.
- Monitoring setup.

Do not advance a phase merely because its screens look complete.

Verify functionality before marking tasks finished.

---

# 18. ABSOLUTE IMPLEMENTATION RULES

1. Do not generate fake functionality.
2. Do not present mock data as real user data.
3. Do not hardcode AI responses as a substitute for AI integration.
4. Do not expose API keys in frontend code.
5. Do not claim emergency messages were sent unless confirmed.
6. Do not claim medically validated predictions without validation.
7. Do not use copyrighted assets without permission.
8. Do not leave buttons without meaningful actions.
9. Do not silently ignore errors.
10. Do not compromise accessibility for animations.
11. Do not create unnecessary complexity.
12. Do not use insecure shortcuts for sensitive information.
13. Do not hide incomplete features behind polished UI.
14. Do not invent integrations that the platform cannot support.
15. Do not describe the application as production-ready until it passes the defined tests.

If a feature requires external credentials, paid APIs, native permissions, medical review, or infrastructure, implement the supported integration boundary and clearly document the remaining setup.

---

# 19. REQUIRED DELIVERABLES

Produce:

- Complete source code.
- Clean project structure.
- Database schema.
- Migration files.
- Authentication configuration.
- AI integration architecture.
- Secure API endpoints.
- Responsive frontend.
- Functional core workflows.
- Automated tests.
- `.env.example`.
- Setup instructions.
- Deployment instructions.
- README documentation.
- Architecture diagrams.
- Privacy and security documentation.
- Feature completion checklist.
- Known limitations.
- Production readiness checklist.

Provide exact local installation and startup commands.

---

# 20. FINAL QUALITY STANDARD

The application must feel like a cohesive, beautifully crafted consumer product.

The visual quality should resemble an award-winning interactive experience, but the engineering quality must resemble a dependable production application.

BLOOM should be:

- Visually extraordinary.
- Technically sophisticated.
- Emotionally comforting.
- Genuinely useful.
- Medically responsible.
- Privacy-first.
- Reliable under adverse conditions.
- Fast and accessible.
- Extensible.
- Maintainable.

The AI companion should be the emotional centerpiece.

The safety features should be the most dependable part.

The menstrual and wellness tools should be the most practically useful part.

The interface should make every ordinary interaction feel effortless.

**BEGIN EXECUTION NOW.**

First, produce the system architecture, development roadmap, database model, and design system specification.

Then scaffold the actual application and implement Phase 1 and Phase 2.

Continue into subsequent phases only after verifying the preceding work.

Prioritize working code, verified functionality, and a polished user experience over lengthy explanations.

Do not stop after generating a product description.

Build the product.