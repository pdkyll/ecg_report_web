
#include <math.h>
#include <emscripten.h>


void EMSCRIPTEN_KEEPALIVE linearInterpolate(float *src, int nSrc, float *dst, int nDst)
{
    double rate = (double)(nSrc - 1) / (double)nDst;

    for (int i = 0; i < nDst; i++)
    {
        double fSrc = i * rate;
        int iSrc = (int)(fSrc);
        double r = fSrc - iSrc;

        dst[i] = (float)(src[iSrc] * (1 - r) + src[iSrc + 1] * r);
    }
}

void EMSCRIPTEN_KEEPALIVE accumulate(float *beats, int *grids, int nBeats, int nBeatSize, int nWidth, int nHeight, float ymin, float ymax)
{
    float samples[2048];
    float epsilon = 0.00001f;
    float ys = ymax - ymin + epsilon;
    float ratio = nHeight / ys;

    for (int i = 0; i < nBeats; i++)
    {
        float *pBeat = beats + i * nBeatSize;
        linearInterpolate(pBeat, nBeatSize, samples, nWidth);

        // 遍历采样点
        for (int j = 0; j < nWidth; j++)
        {
            float v = samples[j];
            // clamp
            v = v < ymin ? ymin : (v > ymax ? ymax : v);
            // y值等比缩放到nHeight
            int y = (int)((v - ymin) * ratio);

            // Y轴反向
            y = nHeight - 1 - y;

            // 累加
            grids[y * nWidth + j]++;
        }
    }
}
