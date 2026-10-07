<div align="center">

# Agent Pet

**Hangi ajan çalışıyor, hangisi seni bekliyor?**

VS Code pencerelerinde Codex, Claude Code ve Google Antigravity.<br>
Tek bir yüzen macOS panelinde çalışan, yanıt bekleyen ve tamamlanan sohbetleri gör.<br>
Sohbete tıklayıp penceresine veya entegre terminaline dön. Kendi petini ekleyip görünümü kişiselleştir.

[![Marketplace sürümü](https://img.shields.io/visual-studio-marketplace/v/merttalhayener.agent-pet?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![Kurulum](https://img.shields.io/visual-studio-marketplace/i/merttalhayener.agent-pet)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![Lisans: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[**Marketplace’ten kur**](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) · [English](README.md) · [Yenilikler](CHANGELOG.md)

<sub>macOS 26+ · Apple Silicon · VS Code 1.96.2+ · English / Türkçe</sub>

<img src="docs/media/workspaces.gif" alt="Yüzen panelde çalışma alanlarına gruplanan ajan sohbetleri ve daraltılan bir proje" width="720">

</div>

Ajanlar birkaç projede birden çalışırken her pencereyi tek tek kontrol etmek işini böler. Agent Pet, sohbetlerini diğer uygulamaların üzerinde görünür tutar. Soruları fark et, ilerlemeyi kontrol et ve tek tıkla doğru sohbete dön.

## Öne çıkan özellikler

- **Üç ajan, tek panel.** Bağlı VS Code pencerelerinde Codex, Claude Code ve resmî Google Antigravity eklentisini takip et. Codex ve Claude Code, VS Code’un entegre terminalinde de desteklenir.
- **Ne olduğunu gösteren durumlar.** Çalışan, yanıt bekleyen ve tamamlanan sohbetleri gör; tur süresiyle yanıt bekleme süresini ayrı takip et. Durumun nedenini görmek için üzerine gel. Doğrulanamayan etkinlik bilinmiyor olarak gösterilir.
- **Doğrudan sohbete dön.** Satıra tıklayıp sohbeti veya terminalini aç. **Ctrl + Option + Cmd + N** ile en uzun süredir yanıt bekleyen sohbetten başlayarak sıradaki sohbete geç.
- **Projelerini düzenle.** Sohbetleri çalışma alanına göre grupla, projeleri daralt ve çalışanlar ya da seni bekleyenler için filtrele. Otomatik eşleşmeyi düzeltmek gerektiğinde çalışma alanını kendin ata.
- **Yanıt isteklerini yakala.** İsteğe bağlı bildirimlere tıklayıp ilgili sohbete git. Panel gizliyken bile menü çubuğundaki sayaç çalışan ve bekleyen sohbetlerin toplamını gösterir.
- **Kendi karakterini ekle.** Byte, Miso veya Fern’i seç; istersen kendi PNG pozlarını yükle. Petinin adını, boyutunu, yönünü ve hareketini ayarla. Paneli petsiz de kullanabilirsin.
- **Görünümü kontrol et.** Paneli taşı, boyutlandır, yazıları ve opaklığı ayarla. Ekran paylaşımında **Ctrl + Option + Cmd + P** ile her şeyi gizle. Tercihlerin yeniden başlatınca korunur.

## Çalışma ve yanıt bekleme sürelerini ayrı gör

Her sohbetin kendi durumu ve sayacı vardır. Tamamlanan turda tik görünür; yanıt bekleyen sohbette en eski yanıtsız isteğin ne kadar süredir beklediği ayrıca gösterilir.

Codex çalışmaya devam ederken soru sorabilir. Agent Pet, çalışan halkasını korur ve **Çalışıyor · açık soru var** yazar. Sıradaki sohbet kısayolu bu soruları da kapsar. Yeniden bağlanma, okunamayan kayıt ve bağlantısı kesilen pencereler ayrı açıklanır. Sessizlik tek başına sohbeti tamamlandı yapmaz.

<img src="docs/media/status.gif" alt="Örnek bir sohbetin çalışıyor, yanıt bekliyor ve tamamlandı durumlarına geçişi" width="600">

Yanıt bildirimleri için **Bildirimler → Yanıtım beklendiğinde bildir** seçeneğini aç. Varsayılan olarak kapalıdır. Tek bir sohbeti sağ tık menüsünden susturabilirsin. [Durumlar, bildirimler ve gezinme (EN)](docs/usage.md#reply-time-and-next-waiting-chat).

## Kendi petini oluştur

**Petler → Kendi petini ekle…** menüsünü seç veya VS Code’da **Agent Pet: Add Custom Pet** komutunu çalıştır. Bir isim ve normal PNG yeterli. Çalışıyor, yanıt bekliyor, mutlu ve uyuyor pozları isteğe bağlıdır; eksik pozlarda normal görsel ve durum işareti kullanılır.

Her pozu önizle, boyutunu ayarla, yatay çevir ve hafif hareketi açıp kapat. Görseller yerel olarak kopyalanır; yeniden başlatma ve eklenti güncellemelerinde korunur. Seçili özel peti değiştirmek veya silmek için **Petler → Özel peti düzenle…** menüsünü kullan.

Her poz için en fazla **10 MB** ve **4096 × 4096 piksel** boyutunda, animasyonsuz PNG desteklenir. Tutarlı bir hizalama için şeffaf arka plan ve aynı tuval boyutlarını kullan. [Özel pet rehberi (EN)](docs/usage.md#custom-pets).

<img src="docs/images/characters.png" alt="Agent Pet’in üç hazır karakteri: robot Byte, kedi Miso ve filiz Fern" width="720">

Yalnızca sohbet panelini mi istiyorsun? **Peti gizle** sohbet listesini açık tutar. **Paneli gizle** yalnızca karakteri bırakır; **Tümünü gizle** ikisini de gizler.

<img src="docs/media/panel-only.gif" alt="Pet gizlenirken sohbet paneli görünür kalıyor, ardından pet geri getiriliyor" width="600">

*Animasyonlar, uygulamada oluşturulan örnek sohbetleri gösterir.*

## Desteklenen kullanımlar

| Ajan | VS Code eklentisi | VS Code entegre terminali |
| --- | --- | --- |
| Codex | Desteklenir | Codex CLI |
| Claude Code | Desteklenir | Claude Code CLI |
| Google Antigravity | Resmî VS Code eklentisi | Desteklenmez |

Eklenti sohbetine tıklayınca ilgili penceredeki sohbet açılır. Terminal sohbetine tıklayınca ajanı çalıştıran terminal görünür olur; ajan klasör değiştirse bile doğru pencereye dönersin. Terminal açık kaldığı sürece satırı listede kalır.

Antigravity için yerel arka ucu başlatmak üzere VS Code panelini bir kez aç. Sorular ve onay istekleri yanıt bekleme süresine, bildirimlere ve sıradaki sohbet kısayoluna dahildir. İç içe alt ajanlar tekrarlayan satır oluşturmaz. Ayrı Antigravity masaüstü uygulaması, Antigravity IDE, CLI ve uzak arka uçlar bu entegrasyonun kapsamı dışındadır. [Antigravity kurulumu ve ayrıntılar (EN)](docs/usage.md#google-antigravity).

Agent Pet, bağlı VS Code pencerelerindeki ajanları takip eder. Başka terminal uygulamaları ve yalnızca bulutta çalışan sohbetler takip edilmez. İzlemek istediğin her pencerede eklenti etkin olmalıdır. Bazı ajan izin diyalogları kayda geçmediği için bildirim oluşturamaz. [Kullanım ve mevcut sınırlar (EN)](docs/usage.md).

## Başla

1. VS Code’a **Codex**, **Claude Code** veya **Google Antigravity** kur ve ajanına giriş yap. Codex ya da Claude Code CLI kullanıyorsan VS Code’un entegre terminalinde başlat.
2. [Agent Pet’i Marketplace’ten kur](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) ya da Extensions’ta `@id:merttalhayener.agent-pet` ara.
3. **Get Started** rehberini takip et. Ajanlarını kontrol eder, paneli açar ve yanıt bildirimlerini etkinleştirmeyi önerir. İstediğin zaman **Agent Pet: Get Started** ile yeniden açabilirsin.

Masaüstü yardımcısı eklentinin içinde gelir. Ayrı bir Agent Pet hesabı, API anahtarı, hook veya sarmalayıcı gerekmez. Canlı durum için VS Code açık kalmalıdır. Eklenti güncellemeleri VS Code üzerinden gelir; otomatik yenileme takip edilen işlerin bitmesini bekler ve **Sonra** düğmesiyle geri sayım gösterir.

**Apple Silicon, macOS 26+ ve VS Code 1.96.2+** gerektirir. Windows, Linux ve Intel Mac masaüstü yardımcıları pakete dahil değildir. [Kurulum, güncelleme ve kaldırma (EN)](docs/usage.md#install-update--remove).

## Hızlı kullanım

Pete veya panele sağ tıkla; macOS menü çubuğundaki pati de aynı menüyü açar.

| İşlem | Kontrol |
| --- | --- |
| Sohbeti veya terminalini aç | Satırına tıkla |
| Sıradaki yanıt bekleyen sohbete geç | **Ctrl + Option + Cmd + N** |
| Çalışma alanına göre grupla | Panel başlığındaki **▤** |
| Sohbetleri filtrele | **Filtreler → Çalışıyor / Yanıtımı bekleyenler** |
| Yanıt bildirimlerini aç | **Bildirimler → Yanıtım beklendiğinde bildir** |
| Kendi petini ekle | **Petler → Kendi petini ekle…** |
| Taşı veya boyutlandır | Peti ya da panel başlığını / sağ üst tutamacı sürükle |
| Yazı boyutu, pet boyutu ve opaklığı değiştir | **Görünüm** |
| Peti veya sohbet listesini gizle | **Peti gizle / Paneli gizle** |
| Her şeyi gizle veya geri getir | **Ctrl + Option + Cmd + P** |
| Paneli VS Code’dan geri getir | Durum çubuğundaki **Agent Pet** |
| Dili değiştir | **Language → English / Türkçe** |

## Verilerin Mac’inde kalır

Agent Pet, yerel etkinlik kayıtlarını ve Antigravity’nin yerel durum akışını okur. Sohbet metinlerini veya pet görsellerini bir sunucuya yüklemez; telemetri eklemez. Yanıt bildirimleri macOS izni gerektirir.

Bağlı pencereleri görmek için pati menüsünden **Bağlantılar ve tanılama** ekranını aç veya **Agent Pet: Connections** komutunu çalıştır. Kopyalanabilir rapora sohbet metinleri, başlıklar, proje adları ve dosya yolları girmez. Raporu nerede paylaşacağına sen karar verirsin.

[Kullanım ve sorun giderme (EN)](docs/usage.md) · [Kaynaktan derleme (EN)](docs/development.md) · [Sürüm notları](CHANGELOG.md) · [Sorun bildir](https://github.com/merttalhayener/agent-pet/issues)

## Lisans

Özgün kaynak kod, Byte, Miso, Fern ve uygulama ikonu [MIT lisanslıdır](LICENSE). Kullanıcının sağladığı pet görselleri kendi lisanslarını korur ve Agent Pet ile dağıtılmaz. Codex, Claude Code ve Google Antigravity adları desteklenen entegrasyonları belirtir; Agent Pet bağımsız bir topluluk projesidir.
