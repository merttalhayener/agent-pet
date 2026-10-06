<div align="center">

# Agent Pet

**Her ajan, her pencere, tek bakış.**

Bir projede Codex, üç projede Claude Code, her biri ayrı VS Code penceresinde.<br>
Tek bir yüzen panel hepsinin durumunu gösterir—tıkladığın sohbetin penceresi öne gelir.

[![Marketplace sürümü](https://img.shields.io/visual-studio-marketplace/v/merttalhayener.agent-pet?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![Kurulum](https://img.shields.io/visual-studio-marketplace/i/merttalhayener.agent-pet)](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet)
[![Lisans: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[**Marketplace’ten kur**](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) · [English](README.md) · [Sürüm notları](CHANGELOG.md)

<sub>**Gereksinimler:** Apple Silicon üzerinde macOS 26+ · VS Code içinde çalışan Codex ve/veya Claude Code · English / Türkçe</sub>

<img src="docs/media/workspaces.gif" alt="Düz sohbet listesi çalışma alanlarına ayrılıyor ve Mobile App grubu daraltılıyor" width="720">

</div>

Aynı anda ikiden fazla ajan çalıştırmaya başladığın anda zor kısım kod olmaktan çıkıp takip etmek oluyor: o refactor hangi pencerede kalmıştı, hâlâ çalışıyor mu yoksa on dakikadır seni mi bekliyor, öbür projedeki hiç bitti mi. Agent Pet bunların hepsini, diğer uygulamaların üstünde duran tek bir listeye koyar.

## Bütün pencereler tek yerde

Bağlı her VS Code penceresindeki her sohbet—Codex ya da Claude Code fark etmeksizin—aynı listede toplanır. Panel başlığındaki **▤** ile sohbetleri çalışma alanına göre grupla, izlemediğin projelerin başlığına tıklayıp grubu daralt. Çok köklü (multi-root) bir çalışma alanı dosyası tek grup sayılır.

**Bir sohbete tıkladığında penceresi öne gelir.** Codex eklentisi sohbetleri kendi penceresinde; Claude eklentisi sohbetleri o pencerenin sağ kenar çubuğunda açılır. Claude sohbetinin mevcut sekmesinde tamamlanmamış bir tur varsa, önce onu bitirip sekmeyi kapat, sonra tekrar tıkla.

**VS Code’un entegre terminali de desteklenir.** Entegre terminalde Codex CLI veya Claude Code çalıştırdığında sohbeti **Terminal** etiketiyle görünür. Satıra tıkladığında ajanı çalıştıran terminal açılır. Sohbetin hangi pencereye ait olduğu terminalin süreç ağacından belirlenir; CLI kapansa bile terminal açık kaldığı sürece satır listede kalır.

Eklenti sohbetleri çalışma alanlarıyla klasör üzerinden eşleşir; bu kesin bir bilgi değil, isabetli bir tahmindir. Yanlış tahmin ettiğinde sohbete sağ tıkla → **Çalışma alanı ata** ile hem doğru gruba hem doğru pencereye sabitle; **Otomatik** kararı geri devreder.

## Hangi sohbetin seni beklediğini gör

Her sohbetin kendi durumu ve geçen süresi vardır: **çalışıyor → yanıt bekliyor → tamamlandı**.

Codex çalışmayı durdurmadan soru sorabilir. O sohbet halkası ve sayacıyla **çalışıyor** kalır, üstünde **Çalışıyor · açık soru var** yazar—yani açık bir soru hiçbir zaman bitmiş iş gibi görünmez. Engelleyici bir soru ya da yanıtlanmamış soruyla biten bir tur ise **Yanıt bekliyor** olur.

**Görünüm → Durum yazıları**'nı açtığında simgeler kelimeye dönüşür: yarıda kestiğin tur için **Durduruldu**, bitiş kaydı olmayan tur için **Bekliyor**, etkinlik şu an doğrulanamıyorsa **Güncelleme yok**. **Güncelleme yok** *bilinmiyor* demektir, *bitti* değil—tik yalnızca açık bir tamamlanma kaydıyla çıkar.

<img src="docs/media/status.gif" alt="Sohbetin dönen halkası önce yanıt bekleme simgesine, ardından tamamlandı tikine dönüşüyor" width="600">

## Gözünü ayırmadan takip et

- **Menü çubuğu sayacı:** çalışan ve bekleyen sayıları macOS menü çubuğunda patinin yanında durur, panel gizliyken bile. Filtreler bu toplamları değiştirmez.
- **Yanıt bildirimleri:** sen açana kadar kapalıdır; **Bildirimler** menüsünden aç. Bildirime tıklayınca o sohbete gidersin; tek bir sohbeti susturmak için ona sağ tıkla. Bildirimler her log satırında değil, yeni algılanan isteklerde çıkar; yeniden bağlanmak eskileri tekrar duyurmaz.
- **Filtreler:** tüm sohbetler, yalnızca çalışanlar veya yalnızca seni bekleyenler—istersen tek bir çalışma alanına daralt.
- **Ekran paylaşmadan önce:** **Ctrl + Option + Cmd + P** her şeyi gizler, aynı kısayol geri getirir.

## Ayar yapmana gerek yok

Codex ve Claude Code zaten Mac’ine oturum kayıtları yazıyor. Agent Pet onları okur. API anahtarı, hook, sarmalayıcı komut ya da ayrı bir hesap yok—kur, mevcut sohbetlerin listede belirsin.

Yalnızca yaşam döngüsü olaylarını okur: bir turun ne zaman başladığını, bittiğini, kesildiğini ya da beklemeye geçtiğini. Sohbet metni hiçbir zaman gösterilmez, saklanmaz, bir yere gönderilmez; hiçbir sohbet verisi Mac’inden çıkmaz.

Güncellemeler de seni bölmemeye çalışır. Masaüstü yardımcısı VS Code’u yeniden yüklemeden kendi sürecini değiştirir; yeniden yükleme gerektiren pencere ise takip ettiği sohbetler bitene, düzenleyicilerin kaydedilene ve çalışan bir görev veya hata ayıklama oturumu kalmayana kadar bekler—sonra **Sonra** düğmesiyle on beş saniye geri sayar. Elle yüklemek istersen `codexPet.autoReloadAfterUpdate` ayarını `false` yap.

## Neyi göremez

Sınırları baştan söylemek, sonradan gizemi açıklamaktan kolay:

- **VS Code dışındaki ajanlar.** Başka bir terminal uygulamasında veya bulutta çalışan Codex/Claude Code takip edilmez. CLI desteği VS Code’un entegre terminalini kapsar.
- **Eklentisiz pencereler.** Takip etmek istediğin her VS Code penceresinde Agent Pet’in o profilde kurulu ve etkin olması gerekir.
- **İz bırakmayan hatalar.** Arka uç hiçbir olay yazmadan ölürse sohbet son bilinen durumunda kalır. Sessizlik tek başına durumu değiştirmez—**Güncelleme yok** tam da bu yüzden tahmin yürütmek yerine var.
- **Bazı izin pencereleri.** Ajanların bazı onay diyalogları kayda geçmez, dolayısıyla bildirim üretemez.

Pati menüsündeki ya da **Agent Pet: Connections** komutuyla açılan **Bağlantılar ve tanılama** ekranı, panelle o an hangi pencerelerin konuştuğunu tam olarak gösterir.

## İstersen bir karakter seç

Panel tek başına çalışır—**Peti gizle** dediğinde sohbet listesi karaktersiz devam eder. **Paneli gizle** tersini yapar, yalnızca pet kalır; **Tümünü gizle** ikisini birden gizler.

Yine de bir karakter istersen: robot **Byte**, kedi **Miso** ve filiz **Fern**—üç özgün, animasyonlu karakter. **Petler** menüsünden seç.

<img src="docs/images/characters.png" alt="Agent Pet’in özgün karakterleri: robot Byte, kedi Miso ve filiz Fern" width="720">

<img src="docs/media/panel-only.gif" alt="Pet gizlenirken sohbet paneli açık kalıyor; ardından pet geri geliyor" width="600">

*Animasyonlar, uygulamada oluşturulmuş örnek sohbetleri gösterir.*

## Kurulum

1. **Codex**, **Claude Code** veya ikisini birden VS Code eklentisi ya da CLI olarak kur ve giriş yap. CLI sohbetleri için ajanı VS Code’un entegre terminalinde başlat.
2. [Agent Pet’i Marketplace’ten kur](https://marketplace.visualstudio.com/items?itemName=merttalhayener.agent-pet) ya da Extensions’ta `@id:merttalhayener.agent-pet` ara.
3. **Get Started** rehberi ilk seferde kendiliğinden açılır. Ajanlarını kontrol eder, paneli açar ve bildirim izni istemeyi önerir. İstediğin zaman **Agent Pet: Get Started** ile yeniden aç.

macOS uygulaması eklentinin içinde gelir; ayrıca kurulacak bir şey yoktur ve yeni sürümler VS Code’un normal eklenti güncellemeleriyle iner. Canlı durum için VS Code açık kalmalıdır.

GitHub önizlemesini mi kullanıyorsun? Tek seferlik geçiş için [Install, update & remove (EN)](docs/usage.md#install-update--remove) bölümüne bak.

## Hızlı kullanım

Aşağıdakilerin hepsi için pete veya panele sağ tıkla; pet gizliyken aynı menü macOS menü çubuğundaki patide durur. Tercihlerin yeniden başlatmadan sonra da korunur.

| Ne yapmak istiyorsun? | Nasıl? |
| --- | --- |
| Sohbetleri çalışma alanına göre grupla | **▤** veya **Görünüm → Genişletilmiş · Çalışma alanları** |
| Sohbetin penceresine git | Sohbete tıkla |
| Yanlış projeye düşmüş sohbeti düzelt | Sağ tıkla → **Çalışma alanı ata** |
| Simgelerin anlamını gör | **Görünüm → Durum yazıları** |
| Taşı / boyutlandır | Peti veya panel başlığını / sağ üst tutamacı sürükle |
| Pet görselini gizle | **Peti gizle**; geri getirmek için **Peti göster** |
| Sohbet listesini gizle veya geri getir | **Paneli gizle / Paneli göster** |
| Her şeyi gizle (ekran paylaşımı) | **Ctrl + Option + Cmd + P** ya da **Tümünü gizle / Tümünü göster** |
| Paneli geri getir | VS Code durum çubuğundaki **Agent Pet** |
| Dili değiştir | **Language → English / Türkçe** |

## Gizlilik ve destek

Telemetri eklemez; sohbet kayıtları Mac’inde kalır. Marketplace indirmelerini ve güncelleme denetimlerini VS Code yönetir. Yanıt bildirimleri macOS izni gerektirir.

Sorun yaşarsan pati menüsünden veya komut paletinden **Bağlantılar ve tanılama** ekranını aç. Bağlı pencereleri listeler ve panoya bir rapor kopyalar—sohbet metinleri, başlıklar, proje adları ve dosya yolları rapora girmez. Hiçbir şey bir yere gönderilmez; raporu nereye vereceğine sen karar verirsin.

[Kullanım ve sorun giderme (EN)](docs/usage.md) · [Derleme ve teknik ayrıntılar (EN)](docs/development.md) · [Sorun bildir](https://github.com/merttalhayener/agent-pet/issues)

## Lisans

Özgün kaynak kod, Byte, Miso, Fern ve uygulama ikonu [MIT lisanslıdır](LICENSE). Harici karakter görseli yüklenmez veya dağıtılmaz. Codex ve Claude Code adları desteklenen entegrasyonları belirtir; Agent Pet bağımsız bir topluluk projesidir.
