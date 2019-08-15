/**
 * Created by jerry on 2017/11/13.
 * 用户相关api
 */
import * as API from './'

export default {
    //获取指定机构各状态报告数量总览
    getCardsInfo:  params => {
        return API.GET('/statistics/states/brief', params)
    },
    //获取指定机构各状态报告数量周期分佈
    getCardsEchartsInfo:  params => {
        return API.GET('/statistics/states/date', params)
    },
    // 统计分析 机构x状态 - all
    getOrganStateApi: (params) => {
        return API.GET('/statistics/institution/state/', params);
    },
    // 统计分析
    getDoctorApi: (params) => {
        return API.GET('/statistics/institution', params);
    },
    // 统计分析  医生管理情况
    getDoctorStateApi: (params) => {
        return API.GET('/statistics/user', params);
    },
    // 统计分析  医院管理情况
    getHospitalStateApi: (params) => {
        return API.GET('/statistics/institutionReportCount', params);
    },
    // 统计分析  医生工作量按机构分布
    getDoctorByHospitalApi: (params) => {
        return API.GET('/statistics/institution/user', params);
    }
}
