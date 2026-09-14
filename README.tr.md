<div align="center">

# Agent Pet

**Kodlama sohbetlerin bir bakışta.**

VS Code’daki **Codex ve Claude Code** sohbetleri için masaüstü yardımcısı.<br>
Başka uygulamadayken de hangi sohbet çalışıyor, hangisi bitti, hangisi seni bekliyor gör.

**macOS 26+ · Apple Silicon · English / Türkçe**

[**İndir**](https://github.com/merttalhayener/agent-pet/releases) · [English](README.md) · [Sürüm notları](CHANGELOG.md)

</div>

## Yeni arkadaşlarınla tanış

Robot **Byte**, kedi **Miso** ve filiz **Fern**. Agent Pet ile gelen üç özgün, animasyonlu karakter. **Petler** menüsünden seç; başka eklentilerden görsel yüklenmez.

<img src="docs/images/characters.png" alt="Agent Pet’in özgün karakterleri: robot Byte, kedi Miso ve filiz Fern" width="720">

## Sohbetin ne zaman seni beklediğini gör

Sohbet **çalışıyor → yanıt bekliyor → tamamlandı** durumlarından geçer. Her sohbetin durumu ve geçen süresi ayrı takip edilir.

<img src="docs/media/status.gif" alt="Sohbetin dönen halkası önce yanıt bekleme simgesine, ardından tamamlandı tikine dönüşüyor" width="600">

## Projeleri ayrı tut

**▤** ile sohbetleri çalışma alanına göre grupla. Yer açmak için grubu daralt; sohbete tıklayarak kendi VS Code penceresine dön.

<img src="docs/media/workspaces.gif" alt="Düz sohbet listesi çalışma alanlarına ayrılıyor ve Mobile App grubu daraltılıyor" width="600">

## Panel kalsın, pet gizlensin

Daha az dikkat dağınıklığı için **Peti gizle** seç. Sohbetler görünür kalır; **Peti göster** karakteri geri getirir. **Paneli gizle** yalnızca sohbet listesini gizler, pet görünür kalır. **Tümünü gizle** ikisini birlikte gizler. **Görünüm → Yalnızca panel** aynı karakter tercihini kontrol eder.

<img src="docs/media/panel-only.gif" alt="Pet gizlenirken sohbet paneli açık kalıyor; ardından pet geri geliyor" width="600">

*Animasyonlar, uygulamada oluşturulmuş örnek sohbetleri gösterir.*

**Yerel VS Code oturumları** desteklenir. Yalnızca CLI veya bulut oturumları desteklenmez. Canlı güncellemeler için VS Code açık kalmalıdır. API anahtarı veya hook ayarı gerekmez.

## Odağını koru

- **Filtreler:** tüm sohbetleri, çalışanları veya yanıtını bekleyenleri göster; tek çalışma alanına daralt.
- **Çalışma alanı ataması:** sohbete sağ tıkla → **Çalışma alanı ata**. Hem grubu hem açılacak pencereyi seç.
- **Açık durum yazıları:** simgelerin yanında **Durduruldu**, **Güncelleme yok** gibi açıklamalar göster.
- **Yanıt bildirimleri:** **Bildirimler** menüsünden aç; macOS bildirimine tıklayarak sohbete dön. Sohbetleri ayrı ayrı sessize al.
- **Menü çubuğu sayacı:** panel gizliyken de çalışan ve bekleyen sohbet sayılarını gör.
- **Güncellemeler:** Marketplace kurulumlarını VS Code günceller. **Güncellemeleri denetle…** mağaza kaydını açar.

## Kurulum

1. VS Code’a **Codex**, **Claude Code** veya ikisini birden kur ve giriş yap.
2. [darwin-arm64 VSIX dosyasını indir](https://github.com/merttalhayener/agent-pet/releases), **Extensions → ⋯ → Install from VSIX…** ile kur.
3. Komut paletinden **Agent Pet: Show Desktop Pet** çalıştır.

0.11.4 itibarıyla çalışan masaüstü paneli, yeni sürüm kurulduktan birkaç saniye sonra eski süreci kapatıp yeni sürüme geçer; görünürlük tercihleri ve aktif sohbetler korunur. Eski sürümden ilk geçişte bu mekanizmanın başlaması için bir kez pencere yenilenmesi gerekir. Güncellemeler takip edilen sohbetler bitip değişiklikler kaydedilince her pencereyi otomatik yeniler; 15 saniyelik **Daha sonra** seçeneği vardır. **GitHub önizlemesinden geçiyorsan**, **Replace preview** seçeneğini kullan; aktif işler bitince her pencerede bir kez **Developer: Reload Window** çalıştır.

## Hızlı kullanım

| Ne yapmak istiyorsun? | Nasıl? |
| --- | --- |
| Pet görselini gizle | **Peti gizle**; geri getirmek için **Peti göster** |
| Sohbetleri grupla | **▤** veya **Görünüm → Genişletilmiş · Çalışma alanları** |
| Taşı / boyutlandır | Peti veya panel başlığını / sağ üst tutamacı sürükle |
| Sohbet listesini gizle veya geri getir | **Paneli gizle / Paneli göster** |
| Tamamen gizle veya geri getir | **Tümünü gizle / Tümünü göster** ya da **Ctrl + Option + Cmd + P** |
| Yeniden aç / dili değiştir | VS Code’daki **Agent Pet** düğmesi / **Language → Türkçe** |

Ayarlar için pete veya panele sağ tıkla. Tercihlerin kaydedilir.

Bağımsız topluluk projesi. Telemetri eklemez; sohbet kayıtları yerel kalır. Marketplace güncellemelerini VS Code yönetir. Yanıt bildirimleri macOS izni gerektirir.

[Kullanım ve sorun giderme (EN)](docs/usage.md) · [Derleme ve teknik ayrıntılar (EN)](docs/development.md) · [Sorun bildir](https://github.com/merttalhayener/agent-pet/issues)

## Marketplace geçişi ve lisans

Agent Pet [VS Code Marketplace üzerinden](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) kurulabilir. **0.14.0** normal release kanalını kullanır; [GitHub paketi](https://github.com/merttalhayener/agent-pet/releases/tag/v0.14.0) hazır, Marketplace yüklemesi bekleniyor. Paket yalnızca **macOS 26+ / Apple Silicon** içindir. Önizleme kurulumundan geçerken **Replace preview** seçeneğini kullanıp aktif işler bitince her pencerede **Developer: Reload Window** çalıştırın. Pet tercihleri korunur. Marketplace sürümünde güncellemeleri VS Code yönetir.

Özgün kaynak kod, Byte, Miso, Fern ve uygulama ikonu [MIT lisanslıdır](LICENSE). Harici karakter görseli yüklenmez veya dağıtılmaz. Codex ve Claude Code adları desteklenen entegrasyonları belirtir; Agent Pet bağımsız bir topluluk projesidir.
