## General features/bugs

- [ ] Debug SW and PWA install on phone

- [ ] Add button to swap cameras on final save dialog
- [ ] Add ability to retake overlay in sequential mode by tapping the overlay preview. Change the text on the overlay preview to say "Tap to retake"
- [ ] Add settings button to control whether camera fills the screen or fits the screen
- [ ] Consider cycling through all cameras? in switch camera? Or showing a popup to select? Or some other settings UI? Show name of current camera somewhere (look at variant.com inspiration)

- [ ] Refactor duplicated "open dialog synchronously for view transition" logic out of useLiveCaptureMode and useSequentialCaptureMode
- [ ] Audit signal usage (there are some `.value` accesses in effects)
- [ ] Utilize signal models

## Design

- [ ] Design logo

- [ ] Add a little flash animation when a photo is taken
- [ ] Consider cleaning up sequential overlay animation (should buttons be over that animation?) (Maybe fade out overlay preview?)
- [ ] "Progress indication that feels like loading film" in design plan not implemented?
- [ ] Implement "Overlay swap: smooth cross-fade when switching cameras"
- [ ] Implement "Photo capture: brief flash + film-advance style transition"
- [ ] Consider if polaroid border on final captured photo looks good
- [ ] Consider if vignette and noise texture look good on mobile
