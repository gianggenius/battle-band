<h1 align="center">battle-band</h1>

<p align="center">
  Cuộc phiêu lưu pixel-art vô tận ngay phía trên ô nhập của app Claude desktop.<br>
  Khi Claude làm việc, hiệp sĩ chiến đấu. Khi Claude rảnh, anh ngủ bên đống lửa trại.
</p>

<p align="center">
  <img src="docs/media/hero.gif" width="753" alt="Hiệp sĩ chém boss băng giá trong dải phía trên ô nhập; hai đường 5H và 1W chạy dọc phía trên">
</p>

<p align="center"><sub>Quay từ app thật (boss vùng băng giá). <a href="README.md">English</a></sub></p>

---

## Nó làm gì

- **Cuộc phiêu lưu đi theo công việc của Claude.** Khi Claude làm việc, hiệp sĩ lần lượt đi qua bốn vùng: **hầm ngục**, **cao nguyên**, **vùng băng giá** và **núi lửa**. Mỗi vùng có ba quái thường rồi một boss. Hiệp sĩ lao tới chém, quái đánh trả, anh né hoặc đỡ, và dấu cảnh báo hiện ra trước đòn lớn của boss.
- **Không bao giờ hết.** Sau núi lửa, hiệp sĩ quay lại hầm ngục, quái trở lại với màu mới và mạnh hơn (vòng "elite").
- **Trại khi Claude rảnh.** Giữa các tin nhắn của bạn, hiệp sĩ ngồi bên đống lửa, ở vùng anh vừa tới.
- **Giới hạn usage của bạn như hai con đường.** Phần trên cùng vẽ giới hạn 5 giờ (**5H**, cuối đường là cái tháp) và giới hạn tuần (**1W**, cuối đường là lâu đài). Một hiệp sĩ nhỏ đi dọc mỗi đường khi giới hạn đầy dần: xanh lá, vàng từ 60%, đỏ từ 85%. Tới cuối đường nghĩa là hết token.
- **Không có gì khác.** Không chữ, không nút, không lệnh, không thông báo. Chỉ một bức tranh phía trên ô nhập; ở terminal và VS Code mod không vẽ gì.

Tiến độ thuộc về phiên: mỗi phiên mới bắt đầu ở hầm ngục, và hiệp sĩ chỉ tiến lên khi Claude làm việc. Lượt làm việc sau tiếp tục đúng chỗ lượt trước dừng.

## Xem thử

<p align="center">
  <img src="docs/media/in-app.png" width="786" alt="Band phía trên ô nhập trong app Claude desktop, trong một trận ở núi lửa">
</p>

<p align="center"><sub>Band phía trên ô nhập, ảnh chụp app thật. Video quay màn hình 100 giây (mp4, 5 MB, bấm là tải về): <a href="docs/media/in-app-recording.mp4?raw=true">in-app-recording.mp4</a> (cao nguyên, băng giá và núi lửa, đổi vùng hai lần).</sub></p>

<p align="center">
  <a href="docs/media/tour.mp4?raw=true"><img src="docs/media/tour-poster.png" width="640" alt="Tải video giới thiệu"></a>
</p>

<p align="center"><sub>Video giới thiệu có chú thích, 93 giây (mp4, 5 MB, bấm vào ảnh để tải về): <a href="docs/media/tour.mp4?raw=true">tour.mp4</a>. Video do chính mã của mod vẽ ra, đúng cách app vẽ (xem <a href="#phát-triển">Phát triển</a>).</sub></p>

### Bốn vùng

Mỗi ảnh là một vùng: một trận đánh, cảnh báo của boss, và đòn kết liễu.

<img src="docs/media/biome-dungeon.png" width="772" alt="Hầm ngục: trận với slime, dấu cảnh báo của vua xương, đòn kết liễu">

<img src="docs/media/biome-plateau.png" width="772" alt="Cao nguyên: trận với goblin, dấu cảnh báo của rùa đá, đòn kết liễu">

<img src="docs/media/biome-ice.png" width="772" alt="Vùng băng giá: trận với slime băng, dấu cảnh báo của yeti, boss tan thành ánh sáng">

<img src="docs/media/biome-volcano.png" width="772" alt="Núi lửa: trận với slime dung nham, dấu cảnh báo của rồng lửa, boss tan thành ánh sáng">

### Trại

<img src="docs/media/camps.png" width="772" alt="Trại ở bốn vùng: hiệp sĩ ngủ bên đống lửa">

### Vòng elite

Cùng một boss ở vòng 1 và vòng 2 (và các vòng sau): màu mới, thêm một hiệp.

<img src="docs/media/elite.png" width="880" alt="Yeti, rồng lửa và vua xương ở vòng 1 và với màu elite ở vòng 2">

### Dải usage

<img src="docs/media/usage-states.png" width="880" alt="Dải usage ở sáu trạng thái: chưa có số liệu, vừa làm mới, ổn, sắp tới, gần hết, hết token">

Thanh thép dưới mỗi đường là thời gian đã trôi của cửa sổ đó, để bạn thấy mình đang đi nhanh hay chậm hơn đồng hồ. Rê chuột lên một đường để xem số chính xác (chữ tooltip bằng tiếng Việt).

## Yêu cầu

- **App Claude desktop** (tab Code). Mod chỉ vẽ trên desktop.
- Đã thử trên: macOS 26.6, app Claude desktop 2.19675.0 với engine đi kèm 2.1.286.
- Windows: cấu trúc thư mục giống nhau nên nhiều khả năng chạy, nhưng **chưa thử**. Linux không có app desktop; giao diện terminal của Claude Code bỏ qua mod này.

Mod dùng hook plugin của engine (`ui.render` cho dải phía trên ô nhập), một API còn mới. Bản engine sau có thể đổi nó: nếu band biến mất sau khi cập nhật, chạy `claude plugin validate` (xem [Phát triển](#phát-triển)).

## Cài đặt

Shell macOS hoặc Linux:

```bash
git clone https://github.com/gianggenius/battle-band.git
cd battle-band
./install.sh
```

Rồi **mở một phiên mới** trong tab Code. Phiên đang mở giữ nguyên những gì đã nạp.

`install.sh` chỉ chép thư mục `plugin/` vào `~/.claude/skills/battle-band`, nơi engine tự nạp thành `battle-band@skills-dir`. Script không sửa setting nào. Nó cũng kiểm tra bản chép khi tìm thấy engine Claude, và cảnh báo nếu `settings.json` đã nạp battle-band bằng cách khác (hai bản sẽ vẽ hai band).

**Không dùng script:** chép thư mục `plugin` vào `~/.claude/skills/battle-band` (Windows: `%USERPROFILE%\.claude\skills\battle-band`, chưa thử) rồi mở phiên mới.

**Cập nhật:** `git pull && ./install.sh`, rồi mở phiên mới.

**Gỡ:** `./install.sh --uninstall` (hoặc xoá thư mục `~/.claude/skills/battle-band`).

<details>
<summary>Các cách nạp khác</summary>

- **Marketplace plugin (người dùng Claude Code CLI):**
  ```bash
  claude plugin marketplace add gianggenius/battle-band
  claude plugin install battle-band@battle-band
  ```
  Repo này là một marketplace chỉ có một plugin. Cập nhật bằng `claude plugin update battle-band@battle-band`.
- **Thư mục bất kỳ, để phát triển:** đặt `CLAUDE_CODE_PLUGIN_DIRS` trỏ tới thư mục `plugin` trong khối `env` của `~/.claude/settings.json`. Đây là cách tác giả đang chạy mod, và là cách duy nhất đã được kiểm cả trong app desktop thật. Mỗi lần chỉ dùng một cách.

Engine nạp cả ba cách ở cùng mức tin cậy (`tier user`). Mỗi cách đã được kiểm không giao diện bằng engine của app desktop trong một thư mục home sạch (`hooks module battle-band@... loaded`).

</details>

## Cách hoạt động

Mod đăng ký bốn hook (`turn.start`, `turn.complete`, `session.measure`, `ui.render` cho thành phần `AbovePrompt`) và trả lời mỗi lần vẽ bằng một phần tử `Svg` duy nhất.

- **Một bức tranh, chuyển động bằng SMIL, không có script.** Band là một bức tranh 190 x 31 đơn vị: dải usage ở 11 hàng trên, cảnh ở 20 hàng dưới. Mọi thứ chuyển động bằng hoạt hình SVG. Các khung của một sprite được đổi bằng độ mờ (opacity), vì app xoá `href` có hoạt hình.
- **Bức tranh là hàm của đồng hồ.** App dựng lại khung của bức tranh từ đầu mỗi khi mod trả lời một lần vẽ. Vì thế mỗi câu trả lời ghi rõ hiệp sĩ đang ở giây nào của lap 48 giây (một `begin` âm), và hoạt hình tiếp tục từ đó thay vì chạy lại từ đầu. Số lần vẽ rất ít: khi Claude bắt đầu hoặc ngừng làm việc, hết mỗi vùng 48 giây, và khi đổi cỡ cửa sổ.
- **Làm việc hay nghỉ** lấy từ cờ `isWorking` của chính app, có hook `turn.start` và `turn.complete` làm dự phòng (một subagent xong việc không đưa hiệp sĩ về trại).
- **Dải usage** đọc cửa sổ 5 giờ và cửa sổ tuần mà engine đã biết (`$.session.usage()` và `session.measure` do engine đẩy). Số liệu mới chờ lần vẽ kế tiếp, để khung không bị dựng lại chỉ vì vài điểm ảnh.
- **Kích thước.** Chiều cao khung tính từ chiều rộng của band. Mỗi bức tranh khoảng 90 KB mã nguồn, dưới giới hạn 131072 ký tự của engine.

Ghi chú thiết kế (tiếng Việt, gồm đường vẽ của app, các giới hạn đã tìm ra và công cụ kiểm tra) ở [docs/design.md](docs/design.md).

## Riêng tư và an toàn

- Mod đọc hai thứ từ engine: lúc một lượt chính bắt đầu và kết thúc, và các cửa sổ usage (phần trăm đã dùng và giờ làm mới). Các hook nhận sự kiện của lượt, nhưng mã không bao giờ đọc nội dung câu hỏi hay câu trả lời của bạn.
- Mod không gửi request mạng nào, không ghi file, không chạy lệnh và không thêm tool, skill, agent hay MCP server. `claude plugin validate plugin` liệt kê các lời gọi engine mà mã thực hiện: `$.clock.after`, `$.clock.now`, `$.session.usage`, `$.ui.invalidate`, `$.ui.resolve`.
- Bức tranh được app làm sạch (DOMPurify) và hiện trong một khung cách ly, không script, không mạng.
- Hãy đọc mã trước khi cài: toàn bộ mod là thư mục `plugin`, điểm vào là `plugin/hooks/register.tsx`.

## Giới hạn đã biết

- **Chỉ app desktop.** Ở giao diện terminal và VS Code mod không vẽ gì.
- **Band tối đi khoảng một giây ở cuối mỗi vùng 48 giây**, lúc bức tranh đổi vùng. Đây là chủ ý (app dựng lại khung ở đó). Trong bản quay màn hình app thật dài 100 giây, hai lần đổi vùng là những khoảnh khắc tối duy nhất, ngoài một lần bức tranh khởi động lại ngắn ngay khi bắt đầu quay (lúc đó có một lệnh công cụ đang chạy; chưa tìm nguyên nhân).
- **Chữ tooltip của các đường usage bằng tiếng Việt** ("Giới hạn 5 giờ: đã dùng 37%, làm mới sau 2 giờ 12 phút"). Số vẫn đọc được; các chuỗi nằm ở `plugin/hooks/adv/usage.ts` nếu bạn muốn dịch.
- **Các đường usage cần số liệu rate-limit của engine.** Chúng xám cho tới khi có số liệu đầu tiên (sau câu trả lời đầu tiên của phiên). Nếu engine không báo cửa sổ 5 giờ hay cửa sổ tuần nào cho tài khoản của bạn, chúng vẫn xám.
- **CPU.** Trong Chrome không giao diện, vẽ bằng phần mềm, hoạt hình dùng khoảng 8 đến 11% một nhân. Chi phí bên trong app chưa được đo.
- **Cần phiên mới** sau khi cài hoặc cập nhật; `/reload-plugins` nạp lại một mod đã được nạp từ lúc phiên bắt đầu.
- Mới thử trên macOS.

## Phát triển

```
plugin/               mod, thư mục duy nhất được cài
  .claude-plugin/       plugin.json
  hooks/                hooks.json và register.tsx (các hook và việc vẽ)
  hooks/adv/            nghệ thuật (sprite, các vùng), dàn cảnh, dải usage, trại
  tests/                12 bài kiểm tra, chạy bằng `claude plugin test`
tools/                script dựng, kiểm tra và deploy
tools/host/           dựng lại cách app vẽ một Svg (bộ làm sạch và khung cách ly) trong Chrome không giao diện
tools/media/          dựng lại các ảnh và video giới thiệu trong docs/media
docs/design.md        ghi chú thiết kế (tiếng Việt)
install.sh            trình cài đặt
.claude-plugin/       marketplace.json
```

`claude` dưới đây là engine. Nếu bạn chỉ có app desktop, dùng engine mà nó đã tải: `~/Library/Application Support/Claude/claude-code/<phiên bản>/<id>/claude.app/Contents/MacOS/claude`.

```bash
claude plugin validate plugin --strict     # manifest, hook, và các lời gọi engine của mã
claude plugin test plugin                  # 12 bài kiểm tra (đồng hồ giả điều khiển chúng)
bun tools/build.ts out all                 # mỗi vùng một SVG, vào ./out
(cd tools/host && npm install)             # một lần: puppeteer-core và DOMPurify
node tools/host/sanitize-check.js out/*.svg   # bộ làm sạch của app sẽ bỏ gì (không được bỏ gì cả)
```

Để làm việc trên mod, đặt `CLAUDE_CODE_PLUGIN_DIRS` trỏ tới thư mục `plugin` của bản làm việc (thay vì chạy `install.sh`), mở một phiên, và chạy `/reload-plugins` sau mỗi thay đổi. `tools/deploy.sh` là cách tác giả đưa bản mới vào thư mục như vậy: kiểm tra và chạy test trên một bản sao sạch, dựng mọi bức tranh qua bộ làm sạch, sao lưu bản cũ rồi chép bản mới.

Các ảnh và video trong `docs/media` do `tools/media/make-media.sh` tạo (cần bun, Chrome, ffmpeg và ImageMagick), trừ `hero.gif`, `in-app.png` và `in-app-recording.mp4` là ảnh chụp và bản quay của app thật.

## Giấy phép

[MIT](LICENSE). Làm bởi GiGi cùng Claude Code. Đây là mod cộng đồng không chính thức: không do Anthropic làm ra, bảo trợ hay hỗ trợ. Claude là nhãn hiệu của Anthropic.
