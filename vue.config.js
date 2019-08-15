module.exports = {
    // 修改的配置
    // 将baseUrl: '/api',改为baseUrl: '/',
    baseUrl: './',
    devServer: {
        // proxy: 'http://ecg2.landmind.cn'
        // proxy: 'http://192.168.1.122:9999'
        // proxy: 'http://192.168.1.165:9999'
        // proxy: 'http://192.168.1.133:9999' //张三
        // proxy: 'http://192.168.1.156:9999' // 敬飞
        // proxy: 'http://192.168.1.164:9999' // 徐驰
        proxy: 'http://ecg-java-test.landmind.cn'
        // proxy: 'http://ecg-java.landmind.cn'
    },
    configureWebpack: {
        output: {
            globalObject: 'this' // `typeof self !== 'undefined' ? self : this`'' -- not working
        }
    }
};
