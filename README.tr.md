<div align="center">

# Agent Pet

**Kodlama sohbetlerin bir bakışta.**

VS Code’daki **Codex ve Claude Code** sohbetleri için masaüstü yardımcısı.<br>
Başka uygulamadayken de hangi sohbet çalışıyor, hangisi bitti, hangisi seni bekliyor gör.

[![Marketplace sürümü](https://img.shields.io/visual-studio-marketplace/v/merttalhayener.agent-pet?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![Kurulum](https://img.shields.io/visual-studio-marketplace/i/merttalhayener.agent-pet)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![Lisans: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[**Marketplace’ten kur**](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) · [English](README.md) · [Sürüm notları](CHANGELOG.md)

<sub>**Gereksinimler:** Apple Silicon üzerinde macOS 26+ · yerel VS Code oturumları (yalnızca CLI veya bulut oturumları desteklenmez) · English / Türkçe</sub>

<img src="docs/media/demo.gif" alt="Agent Pet paneli: kedi Miso’nun altında çalışan ve tamamlanmış Codex ve Claude Code sohbetleri" width="720">

</div>

## Sohbetin ne zaman seni beklediğini gör

Sohbet **çalışıyor → yanıt bekliyor → tamamlandı** durumlarından geçer. Her sohbetin durumu ve geçen süresi ayrı takip edilir. Codex soru sorup çalışmaya devam ediyorsa halka dönmeye devam eder ve **Çalışıyor · açık soru var** yazar.

<img src="docs/media/status.gif" alt="Sohbetin dönen halkası önce yanıt bekleme simgesine, ardından tamamlandı tikine dönüşüyor" width="600">

## Projeleri ayrı tut

**▤** ile sohbetleri çalışma alanına göre grupla. Yer açmak için grubu daralt; sohbete tıklayarak kendi VS Code penceresine dön.

<img src="docs/media/workspaces.gif" alt="Düz sohbet listesi çalışma alanlarına ayrılıyor ve Mobile App grubu daraltılıyor" width="600">

## Panel kalsın, pet gizlensin

Daha az dikkat dağınıklığı için **Peti gizle** seç. Sohbetler görünür kalır; **Peti göster** karakteri geri getirir. **Paneli gizle** yalnızca sohbet listesini gizler, pet görünür kalır. **Tümünü gizle** ikisini birlikte gizler.

<img src="docs/media/panel-only.gif" alt="Pet gizlenirken sohbet paneli açık kalıyor; ardından pet geri geliyor" width="600">

*Animasyonlar, uygulamada oluşturulmuş örnek sohbetleri gösterir.*

## Odağını koru

- **Filtreler:** tüm sohbetleri, çalışanları veya yanıtını bekleyenleri göster; tek çalışma alanına daralt.
- **Yanıt bildirimleri:** **Bildirimler** menüsünden aç; macOS bildirimine tıklayarak sohbete dön. Sohbetleri ayrı ayrı sessize al.
- **Menü çubuğu sayacı:** panel gizliyken de çalışan ve bekleyen sohbet sayılarını gör.
- **Çalışma alanı ataması:** sohbete sağ tıkla → **Çalışma alanı ata**. Hem grubu hem açılacak pencereyi seç.
- **Açık durum yazıları:** simgelerin yanında **Durduruldu**, **Güncelleme yok** gibi açıklamalar göster.

## Yeni arkadaşlarınla tanış

Robot **Byte**, kedi **Miso** ve filiz **Fern**: üç özgün, animasyonlu karakter. **Petler** menüsünden seç.

<img src="docs/images/characters.png" alt="Agent Pet’in özgün karakterleri: robot Byte, kedi Miso ve filiz Fern" width="720">

## Kurulum

1. VS Code’a **Codex**, **Claude Code** veya ikisini birden kur ve giriş yap.
2. [Agent Pet’i Marketplace’ten kur](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) ya da Extensions’ta `@id:merttalhayener.agent-pet` ara.
3. **Get Started** rehberi otomatik açılır. İstediğin zaman **Agent Pet: Get Started** komutuyla yeniden aç.

API anahtarı veya hook ayarı gerekmez. Canlı güncellemeler için VS Code açık kalmalıdır. Yeni sürümler VS Code’un normal eklenti güncellemeleriyle gelir.

GitHub önizlemesinden mi geçiyorsun, ya da güncelleme ve kaldırma ayrıntılarını mı arıyorsun? [Install, update & remove (EN)](docs/usage.md#install-update--remove) bölümüne bak.

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

## Gizlilik ve destek

Telemetri eklemez; sohbet kayıtları Mac’inde kalır. Marketplace indirmelerini ve güncelleme denetimlerini VS Code yönetir. Yanıt bildirimleri macOS izni gerektirir.

Sorun yaşarsan pati menüsünden veya komut paletinden **Bağlantılar ve tanılama** ekranını aç. Hangi VS Code pencerelerinin bağlı olduğunu gösterir ve rapor kopyalamanı sağlar; sohbet metinleri, proje adları ve dosya yolları rapora girmez.

[Kullanım ve sorun giderme (EN)](docs/usage.md) · [Derleme ve teknik ayrıntılar (EN)](docs/development.md) · [Sorun bildir](https://github.com/merttalhayener/agent-pet/issues)

## Lisans

Özgün kaynak kod, Byte, Miso, Fern ve uygulama ikonu [MIT lisanslıdır](LICENSE). Harici karakter görseli yüklenmez veya dağıtılmaz. Codex ve Claude Code adları desteklenen entegrasyonları belirtir; Agent Pet bağımsız bir topluluk projesidir.
