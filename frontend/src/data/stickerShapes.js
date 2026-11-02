// Hình sticker die-cut (khung 100×100) dùng chung cho component Sticker (SVG) và mô hình 3D (vẽ lên canvas).
// smile là hình tròn tâm (50, 50) bán kính 42, mặt cười vẽ thêm bằng SMILE_FACE.
export const STICKER_PATHS = {
  star: 'M50 6l12.6 27.6 30 3.4-22.4 20.3 6.3 29.7L50 71.8 23.5 87l6.3-29.7L7.4 37l30-3.4z',
  heart:
    'M50 88S10 63 10 36c0-14 10-24 22-24 9 0 15 5 18 12 3-7 9-12 18-12 12 0 22 10 22 24 0 27-40 52-40 52z',
  bolt: 'M58 4L18 56h26l-8 40 46-56H54z',
  flower:
    'M50 8c8 0 13 8 12 17 7-6 17-5 21 2s0 16-8 19c8 3 12 12 8 19s-14 8-21 2c1 9-4 17-12 17s-13-8-12-17c-7 6-17 5-21-2s0-16 8-19c-8-3-12-12-8-19s14-8 21-2c-1-9 4-17 12-17z',
  smile: 'M8 50a42 42 0 1084 0 42 42 0 10-84 0z',
  blob: 'M18 30c8-18 38-26 56-14s22 40 8 56-46 18-60 4S10 48 18 30z',
}
export const SMILE_FACE = ['M33 58c9 12 25 12 34 0', 'M37 38v6M63 38v6']
