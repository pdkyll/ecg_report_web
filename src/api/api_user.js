/**
 * Created by jerry on 2017/11/13.
 * 用户相关api
 */
import * as API from "./";

export default {
    //登录
    login: params => {
        return API.POST('/user/login/', params)
    },
    //登出
    logout: params => {
        return API.DELETE('/user/logout/', params)
    },
    // 判断用户是否登陆
    isLogin: params => {
        return API.GET('/user', params)
    },
    changePassword: params => {
        return API.POST('/user/changePassword/', params)
    },
    userUpdate: params => {
        return API.PUT('/me/profile', params)
    },

    userCreate: params => {
        return API.POST('/users', params)
    },

    assisgnDoctor: params => {
        return API.POST('/user/assisgnDoctor/', params)
    },

    lockForAudit: params => {
        return API.GET('/user/lockForAudit/', params)
    },

    unlockForAudit: params => {
        return API.GET('/user/unlockForAudit/', params)
    },

    assignEditor: params => {
        return API.GET('/user/assignEditor/', params)
    },

    doctorList: params => {
        return API.GET('/user/doctorList/', params)
    },

    patientList: params => {
        return API.GET('/user/patientList/', params)
    },

    reportsForEditor: params => {
        return API.GET('/user/reportsForEditor/', params)
    },

    uploaderList: params => {
        return API.GET('/user/uploaderList/', params)
    },

    auditorList: params => {
        return API.GET('/user/auditorList/', params)
    },

    titleStataics: params => {
        return API.GET('/user/titleStataics/', params)
    },

    uploadList: params => {
        return API.GET('/user/upload_list/', params)
    },

    //查询获取book列表(通过page分页)
    recordState: params => {
        return API.POST('/user/record_state/', params)
    },
    // 获取静态的title和logo
    getTitleAndLogo: params => {
        return API.GET('/user/hospital', params)
    },
    frozenUser: params => {
        return API.GET('/user/forbid_accout/', params);
    },
    unFrozenUser: params => {
        return API.GET('/user/enable_accout/', params);
    },
    // 假的删除，可以在已删除处恢复
    deleteReport: (report_id, params) => {
        return API.PUT(`/report/accessSwitch/${report_id}`, params)
    },
    // 永久删除报告
    deleteReportReal: (report_id, params) => {
        return API.DELETE(`/report/delete/${report_id}`, params)
    },
    getInstitutions: (params) => {
        return API.GET('/institutions/institutionTree', params)
    },
    getDoctors: (params) => {
        return API.GET('/user/doctorManager/', params);
    },
    getAssociatedUsers: (params) => {
        return API.GET('/institutions/associatedEditors/', params);
    },
    getDoctorDetail: (params) => {
        return API.GET('/user/doctorLoad/', params);
    },
    updateUser: (params) => {
        return API.GET('/user/updateUser/', params);
    },
    forbidDoctor: (params) => {
        return API.POST('/user/forbid_accout/', params);
    },
    enableDoctor: (params) => {
        return API.POST('/user/enable_accout/', params);
    },
    deleteDoctor: (userId, params) => {
        return API.DELETE(`/users/${userId}`, params);
    },
    // 获取医生在线人数总数
    getDoctorOnlineCount: (params) => {
        return API.GET('/user/all_online_users', params);
    },
    assignGetHospital: params => {
        return API.GET('/institutions/userViewableInstitutionTree', params);
    },
    // 按机构和角色搜索用户
    getUsersByRole: params => {
        return API.GET('/users', params);
    },
    getLogs: params => {
        return API.GET('/logs', params);
    },
    getReportInfo: (params, reportId) => {
        let url = `/reports/${reportId}`;
        return API.GET(url, params);
    }
}
