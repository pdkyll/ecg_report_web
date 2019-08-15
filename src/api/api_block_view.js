/**
 * Created by jerry on 2017/11/13.
 * 用户相关api
 */
import * as API from './'

export default {
    //登录
    getBlockData: params => {
        return API.POST('/ecg/slices', params)
    },
    changeBeatType: (params, reportId) => {
        if (params.isInecgs) {
            return API.PUT_JSON(`/beats/${reportId}?returnSuccessBeatPositions=${params.returnSuccessBeatPositions}&updateMode=${params.updateMode}`, params.param)
        } else {
            return API.PUT_JSON(`/beats/${reportId}`, params)
        }
    },
}
