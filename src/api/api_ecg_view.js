/**
 * Created by jerry on 2017/11/13.
 * 用户相关api
 */
import * as API from './'

export default {
    //登录
    getEcgData: params => {
        return API.GET('/ecg/blocks', params)
    },
    getDayStartEcg: params => {
        return API.GET('/ecg/block_index_until_exist_data', params)
    },
    getLastBlockIndex: params => {
        return API.GET('/ecg/last_block_index', params)
    },
    getEcgDates: params => {
        return API.GET('/ecg/statistics_day_abnormal', params)
    },
    getTagRhythm: params => {
        return API.GET('/ecg/abnormal_list', params)
    },
    getBasicInfo: params => {
        return API.GET('/ecg/record', params)
    },
    upDateTagRhythm: params => {
        return API.GET('/ecg/modify_tag', params)
    },
    userSignTagRhythm: params => {
        return API.GET('/ecg/user_sign', params)
    },
    getHeartRates: params => {
        return API.GET('/ecg/avg_heart_rate_by_day_per_minute', params)
    },
    abnormalNavigation: params => {
        return API.GET('/ecg/abnormal_navigation', params)
    },
    reanalysisRule: params => {
        return API.GET('/ecg/reanalysis_rule', params)
    },
    getAllTagData: params => {
        return API.GET('/ecg/fast_beat_list', params)
    },
    getAbnormalListByDay: params => {
        return API.GET('/ecg/classification_rhythm_abnormal_list_by_day', params)
    },
    getValidDates: params => {
        return API.GET('/ecg/valid_days', params)
    },
    upDateTagRhythmNew: (report_id, type, params) => {
        return API.PUT(`/tag/${report_id}/${type}`, params)
    },
    reAnalystPart: (report_id, params) => {
        return API.GET(`/aiAnalysis/${report_id}`, params)
    },
    // 超级管理员端审核中和标注中的报告触发全局的规则更新
    triggerReAnalysisRule: (params) => {
        let url = '/ecg/reanalysis_rule';
        return API.GET(url, params);
    },
    // 删除心电片段
    deleteBlocks: (reportId, params) => {
        let url = `/ecg/${reportId}/blocks`;
        return API.DELETE(url, params);
    },
    // 翻转心电数据
    reverseVoltage: (params, reportId) => {
        let url = `/voltage/reverse/${reportId}`;
        return API.POST(url, params)
    },
    // 模板修正 得到模板列表缩略图
    getTempList: (reportId, params) => {
        let url = `/template/${reportId}`;
        return API.GET(url, params);
    },
    // 模板修正 同心拍类型下移动模板
    moveTemp: (reportId, beatType, fromTempId, toTempId, params) => {
    let url = `/template/moveToTemplate/${reportId}/${beatType}/${fromTempId}/${toTempId}`;
    return API.POST(url, params);
    },
    // 模板修正 删除模板
    deleteTemp: (reportId, beatType, toTempId) => {
    let url = `/template/delTemplate/${reportId}/${beatType}/${toTempId}`;
    return API.DELETE(url, {});
    },
    // 驳回意见
    getAuditOpinionsList: (reportId) => {
        let url = `/auditOpinions/${reportId}`;
        return API.GET(url);
    },
}
