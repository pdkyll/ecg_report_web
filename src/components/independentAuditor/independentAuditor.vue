<template>
    <div>

    </div>
</template>
<script type="text/ecmascript-6">
    import Util from '../../common/util';
    import APIUser from '../../api/api_user';
    import Cookies from 'js-cookie'
    export default {
        data() {
            return {}
        },
        mounted() {
            let cookie = this.$route.query.cookie;
            if (!cookie || !this.$route.query.reportId) {
                this.$alert('参数不全,请重新登陆', {
                    confirmButtonText: '确定',
                    callback: action => {
                    }
                });
                return
            }
            const from = cookie.indexOf('=') + 1;
            const to = cookie.indexOf(';');
            const session = cookie.substring(from, to);
            if (cookie && this.$route.query.reportId) {
                localStorage.setItem('report_id', this.$route.query.reportId);
                Cookies.set('SESSION', session, {SameSite: "Lax"});
                this.jumpRouter();
            } else {
                this.$alert('登陆状态过期,请重新登陆', {
                    confirmButtonText: '确定',
                    callback: action => {
                    }
                });
            }
        },
        methods: {
            getIsLogin() {
                return new Promise((resolve, reject) => {
                    APIUser.isLogin().then((data) => {
                        if (data) {
                            localStorage.setItem('access-user', JSON.stringify(Object.assign({}, data, {user_id: data.userId}, {userType: -1})));
                            resolve(true);
                        } else {
                            this.$alert('请重新登陆', {
                                confirmButtonText: '确定',
                                callback: action => {
                                }
                            });
                        }
                    })
                })
            },
            async jumpRouter() {
                let isLogin = await this.getIsLogin();
                if (isLogin) {
                    this.$router.replace({path: "/independentAuditorReal"});
                }
            }
        }
    }
</script>
<style type="text/css" scoped lang="scss">

</style> 