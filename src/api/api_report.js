/**
 * Created by jerry on 2017/11/13.
 * 图书相关api
 */
import * as API from './'

export default {

    //查询获取异常数据片段
    getAbnormalData: params => {
        return API.GET('/ecg/abnormal_fragment', params)
    },
    // 获取报告用图数据
    getUsePicData: params => {
        return API.GET('/ecg/classification_rhythm_abnormal', params)
    },
    // 添加/删除选中用图
    changeSelectPic: params => {
        return API.GET('/ecg/user_sign', params)
    },
    // 获取报告信息
    getRecordInfo: params => {
        return API.GET('/ecg/record_info', params)
    },
    // 储存报告信息
    savePdfIndicators: params => {
        return API.POST('/ecg/save_pdf_indicators', params)
    },
    // 重置报告
    resetRecordInfo: params => {
        return API.GET('/ecg/reset_record_info', params)
    },
    // 获取报告用图列表
    getPicList: params => {
        return API.GET('/ecg/classification_rhythm_abnormal_header', params)
    },
    // 获取报告用图列表数据
    getPicListData: params => {
        // ecg/classification_rhythm_abnormal_list?report_id=2&start=0&limit=10&abnormal_name=VC
        return API.GET('/ecg/classification_rhythm_abnormal_list', params)
    },
    // 获取报告工单进度
    getReportFlow: (report_id, params) => {
        const url=`/reports/${report_id}/flows`;
        return API.GET(url, params)
    },
    // 重新审核
    revokeReportAuditing: (params) => {
        return API.POST(`/user/record_state/`, params)
    },
    viewPdf: (report_id, params) => {
        return API.GET(`/pdf/${report_id}/status`, params)
    },
    changeEcgAdd: (report_id, position, params) => {
        let url = `/ecg/${report_id}/slices/${position}`;
        return API.PUT(url, params)
    },
    // 一键归档
    markFinish: params => {
        return API.PUT(`/markFinish`, params)
    },
}
