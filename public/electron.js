"use strict";
exports.__esModule = true;
// public/electron.ts
var electron_1 = require("electron");
var isDev = require("electron-is-dev");
var path = require("path");
// 1. Gabage Collection이 일어나지 않도록 함수 밖에 선언함.
var mainWindow;
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        // 이것들은 제가 사용하는 설정이니 각자 알아서 설정 하십시오.
        //alwaysOnTop: true,
        center: true,
        //fullscreen: true,
        kiosk: !isDev,
        resizable: true,
        webPreferences: {
            // 2.
            // 웹 애플리케이션을 데스크탑으로 모양만 바꾸려면 안 해도 되지만,
            // Node 환경처럼 사용하려면 (Node에서 제공되는 빌트인 패키지 사용 포함)
            // true 해야 합니다.
            nodeIntegration: true
        }
    });
    // 3. and load the index.html of the app.
    if (isDev) {
        // 개발 중에는 개발 도구에서 호스팅하는 주소에서 로드
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    }
    else {
        // 프로덕션 환경에서는 패키지 내부 리소스에 접근
        mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
    }
    // Emitted when the window is closed.
    mainWindow.on('closed', function () {
        mainWindow = undefined;
    });
}
// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
electron_1.app.on('ready', createWindow);
// Quit when all windows are closed.
electron_1.app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});
