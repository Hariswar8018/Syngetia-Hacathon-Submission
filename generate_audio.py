import os
from gtts import gTTS

# Ensure audio directory exists
output_dir = "static/audio"
os.makedirs(output_dir, exist_ok=True)

# Texts mimicking a warning about Pink Bollworm / Crop care
texts = {
    "hi": "नमस्ते किसान भाइयों। कृषि विभाग और सिंजेंटा की ओर से चेतावनी। आपके क्षेत्र में गुलाबी सुंडी का खतरा बढ़ गया है। कृपया तुरंत अपनी फसल पर एम्पलेगो (Amplego) का छिड़काव करें।",
    "mr": "नमस्कार शेतकरी मित्रांनो। कृषी विभाग आणि सिंजेंटा कडून महत्त्वाचा संदेश। सध्याच्या हवामानामुळे कापसावर गुलाबी बोंडअळीचा धोका वाढला आहे. कृपया त्वरित Amplego ची फवारणी करा.",
    "ta": "வணக்கம் விவசாயிகளே. சின்ஜென்டா நிறுவனத்தின் எச்சரிக்கை. உங்கள் பகுதியில் பிங்க் பால்வோர்ம் (Pink Bollworm) தாக்குதல் அதிகமாக உள்ளது. தயவுசெய்து உங்கள் பயிரை பாதுகாக்க உடனடியாக Amplego தெளிக்கவும்."
}

for lang_code, text in texts.items():
    print(f"Generating audio for {lang_code}...")
    tts = gTTS(text=text, lang=lang_code)
    tts.save(os.path.join(output_dir, f"voice_campaign_{lang_code}.mp3"))

print("All audio files generated successfully in static/audio/")
