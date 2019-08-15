/**
 * Created by jerry on 2017/11/13.
 * 用户相关api
 */
import * as API from './'

export default {
    dateRhythms: (report_id, params) => {
        return API.GET(`/ecg/rhythms/${report_id}`, params)
    },
}
