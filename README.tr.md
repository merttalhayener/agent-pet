# Agent Pet

Yapay zekâ kodlama ajanları için masaüstünde yüzen bir pet. Tek petin altında sohbetlerini takip et; bir satıra tıklayarak o sohbete dön.

**Şu an yalnızca VS Code içindeki Codex destekleniyor.** Agent Pet genel bir ajan yardımcısı olarak adlandırılmıştır; diğer ajan entegrasyonları henüz mevcut değildir.

[English](README.md) · [Sürüm notları](CHANGELOG.md)

<img src="docs/images/desktop.png" alt="Pet ve örnek sohbet listesi" width="380">

**Beta · Apple Silicon · macOS 26+ · VS Code ve Codex gerekli**

Bağımsız bir topluluk eklentisidir; resmî OpenAI veya Microsoft ürünü değildir. Arayüz şu an Türkçedir.

## Kurulum

1. VS Code'a resmî **Codex** (`openai.chatgpt`) eklentisini kur ve giriş yap.
2. **[Releases](https://github.com/merttalhayener/agent-pet/releases)** sayfasından `agent-pet-0.5.1.vsix` dosyasını indir.
3. VS Code'da **Extensions → ⋯ → Install from VSIX…** yolundan dosyayı seç.
4. Gerekirse VS Code'u yeniden yükle, projeni aç ve komut paletinden **Agent Pet: Show Desktop Pet** çalıştır.

Pet, VS Code arka plandayken de görünür. Canlı durum güncellemeleri için VS Code açık kalmalıdır.

## Neler var?

- Sohbet başına durum: çalışan için mavi halka, tamamlanan için yeşil tik, yanıt bekleyen soru için sarı gösterge.
- Sohbet satırına tıklayarak VS Code'da ilgili sohbeti açma.
- Sen kaldırana kadar kalan tamamlanmış sohbetler ve çalışma süresi.
- Bitiş animasyonu ve isteğe bağlı ses. Ses varsayılan olarak kapalıdır.
- Başlıktaki okla listeyi daraltma; satıra sağ tıklayarak sohbet sabitleme.
- Sağ üstteki çift yönlü oktan boyutlandırma.
- **Sağ tık → Görünüm:** Yazı boyutu, pet boyutu ve liste opaklığını ayrı ayarlama.
- Açılıp kapatılabilen kenara hizalama ve hatırlanan konum/ayarlar.
- **Ctrl + Option + Cmd + P:** Sunum için gizle ve sessize al; aynı kısayolla geri aç. Menü çubuğundaki pati simgesi de kullanılabilir.

## Sınırlar

Masaüstü uygulaması şu an **Apple Silicon ve macOS 26+** içindir. Windows, Linux ve Intel Mac sürümü yoktur. Beta sürüm geliştirme Mac'inde test edilmiştir; Developer ID imzası/notarizasyonu henüz sağlanmıyor.

Takip, açık VS Code çalışma alanındaki yakın tarihli yerel Codex etkinliğine dayanır. Tüm açık sekmelerin veya bulut sohbetlerinin listesi değildir. Sarı gösterge, kayıtlara yazılan kullanıcı sorularını takip eder; bütün izin pencerelerini algılayamaz.

Pet görselleri kullanıcının kurulu Codex eklentisinden okunur; sprite dosyaları repoya veya VSIX'e eklenmez. Bu proje sohbet kayıtlarını bir sunucuya göndermez ve telemetri eklemez.

## Mevcut kullanıcılar

Projenin önceki adı Codex Pet Panel idi. Yeni sürüm mevcut eklentinin üzerine kurulur; ayarlarını korumak için teknik eklenti kimliği aynı tutulmuştur.

## Kaynaktan derleme

Python 3, Node.js ve macOS 26 SDK içeren Xcode Command Line Tools gerekir:

```sh
python3 scripts/build-native.py
python3 build.py
node --test test/activity.test.cjs
```

Paket `artifacts/` klasöründe oluşur. Mimari, testler ve sınırlamaların ayrıntıları [İngilizce README'de](README.md).

Henüz açık kaynak lisansı seçilmemiştir; paket `UNLICENSED` olarak tanımlıdır. Kaynak kodun yayımlanması genel yeniden kullanım izni vermez.
