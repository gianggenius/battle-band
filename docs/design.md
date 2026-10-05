# battle-band: cuộc phiêu lưu vô tận (thiết kế)

Ngày 2026-10-04. Người dùng đã chọn: nghỉ ở trại khi rảnh, tiến độ riêng từng phiên, làm đủ 4 biome một lần.

## 1. Hành vi

- Band phía trên ô nhập (chỉ app desktop). Không chữ, không nút.
- Khi em làm việc (từ `turn.start` đến `turn.complete` của lượt chính): hiệp sĩ phiêu lưu.
  Một biome gồm: 3 quái thường, rồi boss, rồi đi tiếp sang biome kế.
  Mỗi quái: chạy tới, vài hiệp (hiệp sĩ chém, quái trả đũa, hiệp sĩ né hoặc đỡ), đòn cuối, quái tan thành bụi sáng, con kế bước vào.
  Boss: dài hơn, có đòn đặc biệt riêng, chết rất hoành tráng.
- Biome theo thứ tự: dungeon (hầm ngục), plateau (cao nguyên), ice (băng giá), volcano (núi lửa). Hết volcano thì về dungeon với tier + 1
  (quái đổi tông màu "elite", thêm một hiệp). Nên vô tận.
- Khi rảnh (giữa các lượt): cảnh trại của biome hiện tại (hiệp sĩ ngồi bên lửa, hoạt hình nhẹ).
- Tiến độ (biome, vị trí trong biome, tier) nằm trong `$.state` của phiên: cộng dồn theo thời gian làm việc,
  lượt sau tiếp tục đúng chỗ lượt trước dừng. Phiên mới bắt đầu từ dungeon.

## 2. Ràng buộc đã kiểm

- Một ảnh SVG tối đa 131072 ký tự nguồn, cạnh tối đa 4096 px (engine). Trên app desktop chỉ `Svg` chạy được; module `Client` bị chặn (không nạp được trong 10 s).
- Chỉ SMIL (không script). `animate`, `animateTransform` (translate, scale, rotate, skewX; KHÔNG có matrix), `animate` trên `href` của `<use>` chạy được.
- discrete: keyTimes bắt đầu bằng 0 và keyTime cuối < 1. dur của mọi hoạt hình trong một ảnh phải là ước của chu kỳ ảnh.
  `begin` âm để lùi pha (dùng cho việc tiếp tục giữa chừng). Mỗi `animateTransform` thay `transform` tĩnh, nên lồng nhóm, mỗi nhóm một phép.
- Đổi nguồn ảnh (đầu lượt, cuối lượt, qua ranh giới phân đoạn) có thể làm khung ảnh nạp lại và nháy. Chưa kiểm được trên app. Che bằng màn tối.
- Nền kéo dài ra ngoài viewBox để mép khung (nếu app cho khung cao hơn) không lộ vùng trống.

## 3. Kiến trúc

Viewbox 190x31 (dải usage 11 hàng ở trên, cảnh 20 hàng bên dưới), mặt đất của cảnh ở y = 17 + 11, markup width 1140 height 186, `preserveAspectRatio="xMidYMin meet"`. Dải usage và cảnh nằm trong CÙNG một ảnh (xem mục 12 để biết vì sao).

1. Khuôn (stamp): sprite, vệt chém, vòng sóng, tia lửa, số, ngọn lửa... là `<g id>` trong `<defs>`, đơn sắc nếu có thể
   (tô màu bằng `fill` của `<use>`). Mỗi khuôn dựng một lần.
2. Làn (lane): một `<use>` (hoặc nhóm) có các track: `href` (rời rạc, đổi khung), `visibility` hoặc `opacity`,
   `transform` (translate, scale, skewX, rotate). Track gồm mốc (t, giá trị), trình biên dịch gộp thành keyTimes. Một làn dùng lại cho mọi lần xuất hiện cùng loại.
3. Trình biên dịch dòng thời gian (`timeline.ts`): nhận làn và mốc, xuất SMIL với dur = chu kỳ T, repeatCount vô hạn, `begin="-offset"`.
4. Kịch bản (`episode.ts`): sinh mốc cho một biome từ định nghĩa quái, tier và hạt giống: chạy tới, hiệp, đòn trả đũa, chết, boss, chuyển cảnh.
5. Nền cuộn ba lớp, hệ số 0.25 / 0.5 / 1.0. Ô nền rộng 108 (far), 54 (mid), 18 (ground). Tổng quãng cuộn mỗi chu kỳ D = 432 để vòng lặp liền mạch
   (far dịch 108, mid dịch 216, ground dịch 432: đều là bội nguyên của ô).
6. Phân đoạn: một ảnh có thể chứa 1 hoặc nhiều biome liền nhau (khuôn dùng chung chỉ nạp một lần). Bộ dựng gói biome vào phân đoạn sao cho mỗi ảnh < 120000 ký tự.
7. Màn tối: mỗi ảnh mở bằng fade-in từ tối (0.3 s, một lần, không theo chu kỳ), kết thúc chu kỳ bằng fade-out về tối (0.6 s cuối), giữ tối 0.6 s đầu chu kỳ rồi sáng dần trong 0.8 s. Chỗ đổi ảnh theo bộ hẹn giờ rơi vào khoảng tối.
   Chỗ đổi ảnh theo bộ hẹn giờ rơi vào khoảng tối.

## 4. Chu kỳ biome (T = 48 s)

| Thời điểm (s) | Việc |
|---|---|
| 0.0 - 2.4 | chạy, nền cuộn; quái 1 vào từ phải (đứng yên theo nền) |
| 2.4 - 7.4 | quái 1: các hiệp; 7.4 - 8.4 chết |
| 8.4 - 10.8 | chạy; quái 2 vào |
| 10.8 - 15.8 | quái 2; 15.8 - 16.8 chết |
| 16.8 - 19.2 | chạy; quái 3 vào |
| 19.2 - 24.2 | quái 3; 24.2 - 25.2 chết |
| 25.2 - 30.7 | chạy chậm, nền tối dần, boss vào, gầm |
| 30.7 - 43.5 | boss: 3 loạt đòn, 2 đòn đặc biệt (báo trước, né hoặc đỡ) |
| 43.5 - 46.8 | boss chết, hiệp sĩ giơ kiếm |
| 46.8 - 48.0 | chạy ra, fade-out |

Vị trí màn hình: hiệp sĩ đứng x = 34 (K0). Quái thường và boss đứng tại x tương ứng (boss mép trái 124, quái thường mép trái 118 + căn theo bề rộng).
Hiệp sĩ lao tới (dash-strike), bóng mờ xanh `#44b7ff` 3 bóng, rung màn hình 1 đến 2 px dọc trục chém, quái giật và chớp đỏ, vòng sóng ở nhát nặng.

## 5. Hợp đồng nghệ thuật

Tất cả sprite: `rows` (chuỗi ký tự cùng độ dài), `pal` (ký tự -> '#rrggbb'), '.' trong suốt, hướng nhìn sang TRÁI (về phía hiệp sĩ),
hàng cuối chạm đất (y = 17). Hiệp sĩ cao 13, rộng 12. Quái thường tối đa 16 rộng, 13 cao. Boss tối đa 26 rộng, 17 cao.
Viền tối 1 px bao quanh. Chỉ dùng ký tự in được, không dùng '.' làm màu. Mỗi sprite một bảng màu riêng (không dùng chung ký tự giữa các màu).

Quái: `plugin/hooks/adv/art/monsters.ts` xuất `MONSTERS: Record<BiomeId, MonsterDef[]>` (3 con mỗi biome) và `BOSSES: Record<BiomeId, BossDef>` (có `special`, và `mouth` cho boss khè). Loài bay: chiều cao + `hover` tối đa 17, nếu không đỉnh sprite bị cắt. Kiểm bằng `bun tools/check-monsters.ts`.
Nền: `plugin/hooks/adv/biomes/<biome>.ts` xuất `BiomeArt` (xem `types.ts`). Kiểu và công cụ dựng nằm ở `plugin/hooks/adv/types.ts` và `plugin/hooks/adv/pixel.ts`.

## 6. Trạng thái plugin (đã cài đặt, viết lại 04/10 tối)

Không dùng `$.state` (mỗi lần ghi là một lần vẽ lại, tức một lần app dựng lại khung). Trạng thái là biến cấp module của phiên (mục 12 giải thích vì sao ảnh phải là hàm của đồng hồ):
`walk` (biome, tier, `pos` giây trong lap tại `since`, đang chạy hay không), `turnOn`, `propsOn`, `latest` (các cửa sổ rate-limit), vài bộ hẹn giờ. Quy tắc của engine (validate báo): `$` chỉ được truyền cho hàm khai báo ở đầu file.

- Cảnh nào: `working = isWorking của AbovePrompt (cờ turnRunning của app) hoặc turnOn (turn.start đến turn.complete của lượt chính)`. Mỗi lần vẽ, nếu `working` đổi thì `walk` được bắt đầu hoặc chốt (cộng thời gian đã đi, nghỉ thì không cộng).
- Mỗi lần vẽ ghi vị trí hiện tại trong lap vào ảnh bằng `begin` âm, nên ảnh mới (khung bị dựng lại) tiếp tục đúng chỗ.
- Hết lap: hẹn `after(còn lại + 300 ms)`; hẹn giờ gọi `advance` (biome kế, sau volcano về dungeon với `tier + 1`) rồi `$.ui.invalidate('ui.render')`. 300 ms để đổi ảnh rơi vào khoảng tối (từ 0.1 s trước đến 0.6 s sau hết lap).
- `turn.start` và `turn.complete` (agentId rỗng) chỉ là dự phòng: chờ 250 ms cho cờ của app tự vẽ, nếu ảnh đang hiện chưa khớp thì mới invalidate.
- `session.measure` (engine đẩy): cập nhật `latest`; dải usage lấy `latest` ở lần vẽ kế tiếp (mỗi lap, mỗi lượt). Riêng lần đọc đầu tiên của phiên, khi hiệp sĩ đang nghỉ, thì lên ảnh sau 1.5 s. Lần vẽ đầu hỏi `$.session.usage()` (tối đa mỗi 60 s, tới khi có số liệu).
- Cỡ khung: `height = cột * 8 px * 31 / 190`, không quá `bodyRows * 19`, từ 60 đến 250.
- VS Code: `next(e)`. Terminal: xem mục 13. Mọi lỗi trong lúc vẽ: `next(e)`.

## 7. Kiểm thử

- Kích thước mỗi ảnh < 131072; mọi track hợp lệ (keyTimes tăng, số giá trị khớp).
- Chụp khung bằng Chrome (`setCurrentTime`, chụp giữa khung) tại các mốc hiệp, chết, boss, chuyển biome; kiểm điểm nối vòng lặp bằng độ lệch khung cuối so với khung đầu.
- `claude plugin validate`, `claude plugin test` (mount, vòng lượt, hẹn giờ chuyển biome với đồng hồ giả).
- Nạp thật: chạy `claude -p --debug-file` bằng engine của app (với HOME giả và môi trường rỗng, không cần đăng nhập), tìm dòng `hooks module battle-band@... loaded`.
  Đã kiểm ba cách cài: thư mục skills (`battle-band@skills-dir`), biến `CLAUDE_CODE_PLUGIN_DIRS` (`@inline`), marketplace (`battle-band@battle-band`); cả ba nạp ở tier `user`.

## 8. Rủi ro

- Nháy khi đổi ảnh (chưa kiểm trên app). Kích thước khung ảnh trên app (chưa nhận phản hồi sau lần sửa gần nhất).
- Hiệu năng: vài trăm phần tử SMIL trong khung ảnh nhỏ; đo bằng Chrome trước.
- Chất lượng pixel art của 12 quái, 4 boss, 4 nền: kiểm bằng ảnh xem trước từng bản.

## 9. Giao việc

Thư mục dev (checkout của repo này) không nạp vào phiên nào. Bản chạy của người phát triển nằm ngoài repo, mặc định `~/.claude/user-mods/battle-band/`
và được nạp bằng `CLAUDE_CODE_PLUGIN_DIRS` (xem README, mục Develop). Chỉ chép sang bản chạy khi đã qua kiểm tra: `tools/deploy.sh` kiểm tra một bản sao sạch,
sao lưu bản chạy cũ vào `backups/` rồi chép. Người dùng cuối không cần `deploy.sh`: họ dùng `install.sh`.

## 10. Dải hành trình usage (đã cài đặt)

Một dải nhỏ ở trên cùng band (11 hàng đầu của ảnh 190x31), thể hiện hai giới hạn như hai chặng đường. Không chữ trong ảnh; chữ nằm ở tooltip (hover từng đường).

- Nguồn: `session.measure` (đẩy), phần tử `{ kind: 'five_hour' | 'seven_day', percentUsed: 0..100, resetsAt?: ISO }`. Không có số liệu: đường xám, người ở vạch xuất phát, tooltip "chưa có số liệu".
- Hai đường, mỗi đường 5 hàng, cách nhau 1 hàng (dải cao 11 hàng, cả ảnh 190x31): 3 hàng cho người và công trình, 1 hàng là đường, 1 hàng là thanh thời gian. Bên trái mỗi đường có nhãn chữ pixel nhỏ (phông 5x7, mỗi điểm nửa hàng, cao 3.5 hàng, có bóng tối để đọc được trên mọi nền trời): "5H" cho giới hạn 5 giờ, "1W" cho giới hạn tuần, rồi cờ xuất phát. Dải KHÔNG có tấm nền: trời của cảnh (dải màu trên cùng, kéo lên) lộ ra sau các đường. Thân hiệp sĩ nhỏ vẽ bằng màu của mức (xanh, vàng, đỏ) nên thấy được trên mọi trời.
  Trái: cờ xuất phát. Phải: đích (5 giờ: tháp; tuần: lâu đài). Hiệp sĩ nhỏ 3x4 đứng ở `percentUsed` trên đường, đi chân hai nhịp (tới đích là hết token).
  Phần đã đi tô đặc theo mức: xanh (dưới 60), vàng (dưới 85), đỏ (từ 85, lửa nhấp nháy trên đích); phần chưa đi là đường chấm, có vạch 25/50/75.
  Thanh thời gian (xanh thép, đầu sáng) là phần thời gian đã trôi của cửa sổ (từ `resetsAt`), để thấy mình đi nhanh hơn hay chậm hơn đồng hồ.
  Cửa sổ đã qua `resetsAt`: vẽ lại từ 0%, tooltip "đã làm mới".
- Rê chuột hiện `<title>` tiếng Việt, một dòng mỗi đường: "Giới hạn 5 giờ: đã dùng 37%, làm mới sau 2 giờ 12 phút" (khoảng thời gian tương đối, không phụ thuộc múi giờ).
- Cập nhật: dải nằm CÙNG ảnh với cảnh nên chỉ đổi khi ảnh được vẽ lại (xem mục 6): mỗi lap, mỗi lượt, đổi cỡ cửa sổ.

## 11. Phong cách pixel art

Cùng họ với hiệp sĩ và quỷ lửa hiện có (`plugin/hooks/adv/art/hero.ts`, `plugin/hooks/adv/scene-v1.ts`): viền tối 1 px, ba tông (tối, giữa, sáng) cho mỗi vùng màu,
mắt hoặc điểm nhấn sáng để đọc được hướng nhìn, tối đa khoảng 8 màu mỗi sprite, xem rõ ở độ phóng 6 lần. Nền thấp tương phản ở vùng đánh nhau (x từ 30 đến 150) để sprite nổi.

## 12. Cách app desktop vẽ một `Svg` (đọc từ mã renderer của app, 04/10/2026; kiểm bằng `tools/host/`)

Bản đầu của adventure hỏng trên app dù qua validate, test và chụp khung bằng Chrome, vì mọi lần kiểm đều dùng SVG thô, không qua đường vẽ thật. Đường vẽ thật:

- Mỗi lần engine trả một kết quả `ui.render`, app DỰNG LẠI toàn bộ DOM của band (không so sánh với bản trước): iframe mới, hoạt hình chạy lại từ 0, có một khoảng trống ngắn lúc nạp.
  Vì thế ảnh phải là hàm của đồng hồ (mỗi lần vẽ ghi rõ đang ở giây nào của lap, `begin` âm), và số lần vẽ phải ít: cờ `isWorking` của app, hết lap (mỗi 48 s, rơi vào khoảng tối), đổi cỡ cửa sổ.
- `isInteractive`: `<iframe sandbox="" loading="lazy" srcdoc=...>`; không có `width`/`height` thì iframe chỉ có cỡ mặc định 300x150 (co giãn ngang nhờ Box cột, cao đúng 150 px). Nên LUÔN truyền `height` (px) và bọc trong `<Box flexDirection="column">` để iframe giãn hết bề ngang.
  Trong iframe: `body>svg{width:100%;height:100%}` nên nội dung vừa khung theo `preserveAspectRatio` (`xMidYMin meet`), phần thừa là nền kéo dài (EXT) và ô nền kéo ra MARGIN mỗi bên.
- Mọi SVG đi qua DOMPurify (hồ sơ svg + svgFilters; thêm thẻ `animate`, `set`, `use`; thêm thuộc tính `from`, `to`, `calcMode`; cấm `script`, `foreignObject`, `image`, `a`, `iframe`) và một hook: `attributeName="href"` (và `xlink:href`) BỊ XOÁ, nên không thể đổi khung bằng cách animate `href` của `<use>`.
  Cách dùng ở đây: mỗi khung là một `<use>` riêng, bật bằng `opacity` (`choose()` trong `timeline.ts`). `tools/check-svg.ts` cấm `attributeName="href"`, `tools/host/sanitize-check.js` đếm thẻ/thuộc tính trước và sau scrub.
- Band là một cửa sổ cuộn cao tối đa `11lh + 40px` (khoảng 258 px); cây cao hơn thì cuộn. Ảnh phải thấp hơn thế: cả band là một khung duy nhất, `height = cột * 8 px * 31 / 190`, kẹp 90 đến 250.
- Prop `isWorking` của `AbovePrompt` là cờ "phiên đang chạy" của app; `maxRows` là 12; `bodyColumns` là số ô chữ ngang (một ô khoảng 8 px).
- Giới hạn: `source` tối đa 131072 ký tự, `width`/`height` tối đa 4096.
- `tools/host/band-sim.js` dựng lại cả band (khung, iframe, scrub, CSS cao tối đa) ở một bề ngang tuỳ ý; `tools/host/host-frames.js` chụp khung SMIL theo thời điểm qua scrub; `tools/host/cpu.js` đo tải; `tools/host/flash-scan.js` bước từng 0.1 s qua cả lap, đo độ sáng và lượng điểm trắng để tìm chỗ nháy. Mọi kiểm tra ảnh cuối cùng phải đi qua các công cụ này.

Kết quả quét 04/10 (752x124, 4 vùng, tier 0 và 1, 4 trại): trong ảnh không có chỗ nháy ngoài ý định. Các bước nhảy sáng lớn nhất là đoạn tối chuyển vùng (vùng sáng: độ sáng 133 về 11 trong 0.6 s lúc 47.4 đến 48.0 s, rồi sáng lại 0.6 đến 1.4 s), và cú trắng khi boss chết (tối đa 4 đến 9% diện tích). Trại: chỉ có nhịp sáng dần 0.3 s đầu, sau đó ổn định (đổi dưới 1 mức).

## 13. Band cho terminal (đã cài đặt, 05/10/2026)

- Nguồn gốc: bản thử `battle-band-term` (một phiên Terminal, tối 04/10) vẽ cảnh của bản cũ bằng `Raster`. Mục này đưa cách đó vào bản hiện tại, vẽ chính các ảnh SVG của band.
- Terminal không có `Svg`. Phần tử dùng được: `Box`, `Text` và `Raster` (lưới ô: mỗi ô là `[mã ký tự, màu chữ, màu nền]`, màu `0x00RRGGBB`, cả lưới là base64 của các u32 little-endian; 1 đến 512 cột, 1 đến 256 dòng). Cập nhật tại chỗ bằng `$.ui.blit({ requestId, key, cells, columns, rows })` (engine nhận tối đa 120 lần mỗi giây, hiện khoảng 60), không dựng lại cây.
- Bộ vẽ: `plugin/hooks/term/svgraster.ts` vẽ các SVG của band vào bộ đệm RGB ở thời điểm bất kỳ. Nó hiểu đúng tập con mà các ảnh dùng: `g`, `use`, `path` (các run `M h v h z`), `rect`; `translate`, `scale`, `skewX`; `animate` trên opacity, x, y, fill; `animateTransform`; calcMode discrete, linear, spline; `begin` âm; `fill="freeze"`. Mỗi khung khoảng 0,2 ms, phân tích cú pháp khoảng 5 ms mỗi ảnh (một lần cho mỗi lap). Độ mờ của nhóm tính theo từng hình (khác Chrome chỗ hình chồng nhau trong một nhóm mờ).
- Kiểm: `tools/host/term-compare.js` vẽ cùng một ảnh bằng bộ vẽ và bằng Chrome (qua bộ làm sạch của app) ở một điểm ảnh một đơn vị, rồi đếm điểm ảnh khác nhau. Chrome làm mờ viền của hình nằm lệch nửa điểm ảnh, bộ vẽ làm tròn về lưới, nên điểm ảnh chỉ bị tính là "không giải thích được" khi màu của Chrome không nằm giữa màu của bộ vẽ và một trong 8 điểm ảnh lân cận. Kết quả (7 cuộc phiêu lưu ở 27 thời điểm, 4 trại ở 10 thời điểm): tối đa 22 trên 5890 điểm ảnh của vùng cảnh (0,4%); trại: 0.
- Bố cục: hai dòng chữ (mỗi đường một dòng: nhãn, đường `━` đã đi, `♞`, `┈` còn lại, tháp `♜` hay lâu đài `♖`, số phần trăm và thời gian còn) trên tấm nền tối (để đọc được trên terminal nền sáng), rồi một `Raster` tối đa 10 dòng. Cảnh (20 điểm ảnh) hai điểm ảnh một ô: ký tự `▀` với màu chữ là điểm ảnh trên, màu nền là điểm ảnh dưới; ô một màu là dấu cách, để không lộ khe của glyph. Dải usage vẽ bằng điểm ảnh sẽ nhoè ở một điểm ảnh một đơn vị, nên ở terminal nó là chữ.
- Vừa khung (`fitScene(cột, dòng)`): vùng hành động (x từ 28 đến 152) luôn phải thấy. Từ 124 cột trở lên giữ 1:1, cắt quanh x = 90 nếu hẹp hơn 190 cột; hẹp hơn nữa thì thu nhỏ đều hai chiều bằng bộ lọc hộp. Ít chỗ thì thu nhỏ cảnh, và dưới 8 dòng (`maxRows`) bỏ hai dòng chữ.
- Nhịp: một `$.clock.every`, 12 khung mỗi giây khi chiến đấu, 3 khung mỗi giây ở trại (đổi nhịp thì dựng lại bộ hẹn giờ, do lần vẽ lại khi cờ `isWorking` đổi); khung giống hệt khung trước thì không gửi; bị từ chối 20 lần liên tiếp (band bị gập) thì dừng, lần vẽ sau chạy lại. Thời điểm của ảnh lấy từ `walk` (cùng trạng thái với desktop): giây trong lap khi chiến đấu, đồng hồ tự do ở trại. Chữ của hai đường vẽ lại khi có số liệu mới (`session.measure`) và mỗi 30 giây.
- Giới hạn của engine, đo trên màn hình thật (Claude Code 2.1.289 chạy trong tmux, đọc bằng `tmux capture-pane -p -e`): màu của Raster được vẽ 4 bit mỗi kênh (mọi giá trị trên màn hình là bội của 17); trong tmux Claude Code chỉ dùng 256 màu trừ khi đặt `CLAUDE_CODE_TMUX_TRUECOLOR=1`; Raster vẽ tối đa 1024 cặp màu cùng lúc, mà một khung dùng nhiều nhất 246 cặp ở 190 cột (610 khi thu nhỏ), nên không cần giảm màu trước.
- CPU (một nhân, Claude Code 2.1.289): không mod khoảng 1%, trại 3,5%, chiến đấu 9%. Gần hết là chi phí vẽ lại của engine cho mỗi lần blit (khoảng 1% cho mỗi khung hình một giây); phần của mod dưới 0,5 ms mỗi khung (bộ vẽ 0,2 ms, cắt và co 0,1 ms, base64 0,1 ms).
- Thử trên terminal thật: `tmux` với môi trường sạch (`env -i`), `claude --setting-sources project,local --plugin-dir <thư mục plugin>` (không nạp bản chạy thật), thư mục làm việc tạm đã tin cậy, rồi `tmux capture-pane -p -e`. Để xem cảnh chiến đấu mà không gọi model: sao chép plugin và đổi `propsOn = e.props.isWorking === true` ở nhánh terminal thành `propsOn = true`.
- Chưa kiểm: Windows Terminal, kitty, Ghostty; bản thử đầu chạy được ở Apple Terminal theo tác giả.
