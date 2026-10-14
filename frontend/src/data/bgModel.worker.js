// Chạy mô hình tách nền U²-Netp (Apache-2.0) bằng onnxruntime-web (MIT) trong Web Worker để trang không bị đơ.
// Mô hình và file chạy nằm ngay trên trang web: /models/u2netp.onnx, /ort/* (chép từ node_modules khi build).
// Nhận ảnh 320×320 đã chuẩn hoá (Float32, CHW), trả về mặt nạ 320×320 (Float32, 0 = nền, 1 = sticker).
import * as ort from 'onnxruntime-web/wasm'

ort.env.wasm.wasmPaths = '/ort/'
ort.env.wasm.numThreads = 1 // không cần cross-origin isolation

let session

self.onmessage = async (e) => {
  const { id, input, size } = e.data
  try {
    session ??= await ort.InferenceSession.create('/models/u2netp.onnx', { executionProviders: ['wasm'] })
    const feeds = { [session.inputNames[0]]: new ort.Tensor('float32', input, [1, 3, size, size]) }
    const out = await session.run(feeds)
    const mask = new Float32Array(out[session.outputNames[0]].data)
    self.postMessage({ id, mask }, [mask.buffer])
  } catch (err) {
    session = undefined
    self.postMessage({ id, error: String(err?.message || err) })
  }
}
