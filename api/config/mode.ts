/**
 * Get the mode of the application
 * @returns 'web' if the application is running in web mode, 'electron' if it is running in electron mode
 */
export const getMode = (): 'web' | 'electron' => {
    const isRunningAsSubprocess = process.argv[2] === '--subprocess';
    if (isRunningAsSubprocess) {
        return 'electron';
    }
    
    if (process.env.DEV_ELECTRON) {
        return 'electron';
    }

    return 'web';
}

