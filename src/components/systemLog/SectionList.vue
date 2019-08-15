<template>
    <section>
        <section class="tableStyle" :style='{ fontSize: fontSize + "px", paddingRight: "20px"}'>
            <span :style='{boxSizing: "border-box", padding: padding + "px"}'>{{time}}</span>
            <span :style='{boxSizing: "border-box", padding: padding + "px"}'>{{showItem.institutionName}}</span>
            <span :style='{boxSizing: "border-box", padding: padding + "px"}'>{{role}}</span>
            <span :style='{boxSizing: "border-box", padding: padding + "px"}'>{{showItem.nickname}}</span>
            <span :style='{boxSizing: "border-box", padding: padding + "px"}'>{{showItem.username}}</span>
            <span :style='{boxSizing: "border-box", padding: padding + "px"}'>{{operation}}</span>
            <span :style='{boxSizing: "border-box", padding: padding + "px", cursor: "pointer"}' @click="jumpToMessage">{{message}}<span
                    v-if="extraMessage" :style="{'color': extraMessageColor}">-{{extraMessage}}</span></span>
        </section>
    </section>
</template>
<script>
    import Util from '../../common/util';
    import Api from  '../../api/api_user';

    export default {
        name: 'sectionList',
        props: {
            showItem: {
                type: Object,
                default: {}
            },
            fontSize: {
                type: Number,
                default: 16
            },
            padding: {
                type: Number,
                default: 5
            }
        },
        computed: {
            role() {
                let roleMap = {
                    'ROLE_EDITOR': '标注医生',
                    'ROLE_AUDITOR': '审核医生',
                    'ROLE_UPLOADER': '上传医生',
                    'ROLE_ADMINISTRATOR': '数据管理员',
                    'ROLE_SUPER_ADMINISTRATOR': '超级管理员',
                };
                return roleMap[this.showItem.userType] || '标注医生'
            },
            operation() {
               let operationMap = {
                   'USER': '个人操作',
                   'REPORT': '报告操作',
                   'INSTITUTION': '医院操作',
                   'DOCTOR': '医生操作',
                   'SYSTEM': '系统通知'
               };
               return operationMap[this.showItem.category] || '个人操作'
            },
            time() {
                if (this.showItem.operationTime) {
                    return Util.formatTimeH(new Date(this.showItem.operationTime))
                }
                if (this.showItem.time) {
                    return this.showItem.time
                }
                return ''
            },
            message() {
                return this.showItem.content.split('-')[0];
            },
            extraMessage() {
                return this.showItem.content.split('-').slice(1).join('-');
            },
            extraMessageColor() {
                let colorMap = {
                    'USER': '#000',
                    'REPORT': '#090',
                    'INSTITUTION': '#c66',
                    'DOCTOR': '#ff9984',
                    'SYSTEM': '#03f'
                };
                return colorMap[this.showItem.category];
            }
        },
        methods: {
            jumpToMessage() {
                console.log(this.showItem);
                switch (this.showItem.category) {
                    case 'REPORT':
                            if (this.showItem.targetAvailable) {
                                this.$router.push({
                                    name: 'superPatientList',
                                    params: {
                                        reportId: this.showItem.targetId
                                    }
                                });
                            } else {
                                this.$router.push({
                                    name: 'superPatientList',
                                    params: {
                                        reportId: this.showItem.targetId,
                                        deleted: true
                                    }
                                });
                            }
                        break;
                    case 'INSTITUTION':
                        let name = this.showItem.content.split(' - ')[1];
                        if (this.showItem.targetAvailable) {
                            this.$router.push({
                                name: 'superAgentManage',
                                params: {
                                    institutionName: name,
                                    institutionId: this.showItem.targetId
                                }
                            });
                        } else {
                            this.$message.closeAll();
                            this.$message.error('该数据已被删除!');
                        }
                        break;
                    case 'DOCTOR':
                        if (this.showItem.targetAvailable) {
                            this.$router.push({
                                name: 'superDoctorManage',
                                params: {
                                    targetName: this.showItem.targetName
                                }
                            });
                        } else {
                            this.$message.closeAll();
                            this.$message.error('该数据已被删除!');
                        }
                        break;
                    case 'SYSTEM':
                        if (this.showItem.targetAvailable) {
                            this.$router.push({
                                name: 'superSystemMessage',
                                params: {
                                    targetName: this.showItem.targetName
                                }
                            });
                        } else {
                            this.$message.closeAll();
                            this.$message.error('该数据已被删除!');
                        }
                        break;
                    default: break;
                }
            }
        }
    }
</script>
<style scoped lang="scss">
    .tableStyle {
        display: grid;
        grid-template-columns: 103px 138px 138px 138px 138px 139px 396px;

        span {
            display: inline-block;
        }
    }

    .greenColor {
        color: #19a133;
    }
</style>