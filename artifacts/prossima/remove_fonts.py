import os
import re

files = [
    "/home/paco/dev/prossima-ios/artifacts/prossima/app/(tabs)/_layout.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/app/(tabs)/analytics.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/app/(tabs)/index.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/app/(tabs)/quicklog.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/app/(tabs)/session.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/app/(tabs)/settings.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/app/exercise/[id].tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/BarChart.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/CelebrationOverlay.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/ConcentricRingChart.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/ErrorFallback.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/ExerciseCard.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/RestTimerModal.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/RingChart.tsx",
    "/home/paco/dev/prossima-ios/artifacts/prossima/components/SetLogModal.tsx"
]

pattern = re.compile(r'\s*fontFamily:\s*[\'"]Inter_[a-zA-Z0-9]+[\'"],?')

for f in files:
    if os.path.exists(f):
        with open(f, 'r') as file:
            content = file.read()
        content = pattern.sub('', content)
        with open(f, 'w') as file:
            file.write(content)
