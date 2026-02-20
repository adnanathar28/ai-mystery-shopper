const { devices } = require('playwright');
module.exports = {
    mobile: {
        label: "iPhone 13",
        settings: devices['iPhone 13']
    },
    tablet: {
        label: "iPad Mini",
        settings: devices['iPad Mini']
    }
};