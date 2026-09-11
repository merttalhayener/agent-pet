<div align="center">

# Agent Pet

**Kodlama ajanların bir bakışta.**

Hangi sohbet çalışıyor, hangisi bitti, hangisi seni bekliyor? Masaüstündeki petten takip et.

![macOS 26+](https://img.shields.io/badge/macOS-26%2B-111827?style=flat-square&logo=apple)
![Apple Silicon](https://img.shields.io/badge/Apple_Silicon-only-64748b?style=flat-square)
![Codex desteği](https://img.shields.io/badge/Destek-Codex_%2B_VS_Code-16865d?style=flat-square)
![Beta](https://img.shields.io/badge/Durum-beta-d97706?style=flat-square)

**[macOS için indir](https://github.com/merttalhayener/agent-pet/releases/tag/v0.5.2)** · [English](README.md) · [Sürüm notları](CHANGELOG.md)

<img src="docs/images/desktop.png" alt="Çalışan ve tamamlanan sohbetleri gösteren Agent Pet" width="420">

</div>

## Tek pet. Takip ettiğin sohbetler bir arada.

Başka uygulamada çalışırken yerel sohbetlerini takip et. Satıra tıklayıp VS Code'daki sohbete dön. Biten sohbetler sen kaldırana kadar listede kalsın.

| Durumu gör | Kendine göre ayarla | Odaklan |
| --- | --- | --- |
| 🔵 Çalışıyor · ✅ Bitti · 🟡 Yanıt bekliyor | Pet, boyut, yazı ve saydamlık seçimi | Listeyi daraltma ve sohbet sabitleme |
| Her çalışma için geçen süre | Serbest taşıma ve kenara hizalama | Bitiş animasyonu ve isteğe bağlı ses |

<table>
<tr>
<td align="center" width="50%"><strong>Az yer kaplasın</strong><br><br><img src="docs/images/compact.png" alt="Pet ve sohbet sayacından oluşan daraltılmış görünüm" width="210"></td>
<td align="center" width="50%"><strong>Seni bekleyeni fark et</strong><br><br><img src="docs/images/waiting.png" alt="Yanıt bekleyen sohbetin sarı göstergesi" width="350"></td>
</tr>
</table>

**Sunum veya ekran paylaşımı mı var?** **Ctrl + Option + Cmd + P** ile peti gizle ve bildirimlerini sessize al. Aynı kısayolla ya da menü çubuğundaki pati simgesinden geri aç.

## Neler destekleniyor?

| | Şu an |
| --- | --- |
| **İşletim sistemi** | Apple Silicon üzerinde macOS 26+ |
| **Ajan** | VS Code içindeki Codex |
| **Diğer ajanlar / platformlar** | Henüz desteklenmiyor |

Arayüz Türkçedir. Canlı güncellemeler için VS Code açık kalmalıdır. Agent Pet bağımsız bir topluluk projesidir.

## Kurulum

1. VS Code'a resmî **Codex** eklentisini kur ve giriş yap.
2. [**agent-pet-0.5.2.vsix** dosyasını indir](https://github.com/merttalhayener/agent-pet/releases/download/v0.5.2/agent-pet-0.5.2.vsix).
3. VS Code'da **Extensions → ⋯ → Install from VSIX…** yolundan dosyayı seç.
4. Komut paletinden **Agent Pet: Show Desktop Pet** çalıştır.

**Satıra tıkla:** Sohbeti aç. **Peti sürükle:** Taşı. **↗↙ tutamacını çek:** Boyutlandır. **Sağ tıkla:** Ayarları aç. Listenin başlığındaki okla daralt veya genişlet.

Eski sürümden güncelliyorsan VS Code'u bir kez yeniden yükle; eski yan paneldeki **Pet** bölümü kalkar. Masaüstü petinin ayarları korunur.

<details>
<summary><strong>Beta notları ve yerel veriler</strong></summary>

- Açık çalışma alanındaki yakın tarihli yerel sohbetleri takip eder; tüm açık sekmeleri veya bulut sohbetlerini listelemez.
- Yanıt bekleyen sorular yerel kayıtlardan algılanır; bazı izin pencereleri algılanamaz.
- Eklenti telemetri eklemez, sohbet kayıtlarını sunucuya göndermez. Pet görselleri kurulu Codex eklentisinden okunur.
- Developer ID imzası/notarizasyonu ve genel bir açık kaynak lisansı henüz sağlanmıyor.

</details>

**[Derleme ve teknik ayrıntılar](docs/development.md)** · **[Sorun bildir](https://github.com/merttalhayener/agent-pet/issues)**
