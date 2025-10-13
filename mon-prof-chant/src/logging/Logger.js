/**
 * Logger.js
 * Système de logging centralisé
 * Type: Foundation/Utility
 */

class Logger {
    static #logs = [];
    static #maxLogs = 1000;
    static #logLevels = {
        debug: 0,
        info: 1,
        warn: 2,
        error: 3,
        critical: 4
    };
    static #currentLevel = 0; // Par défaut : tout afficher

    /**
     * Configure le niveau de log minimum
     */
    static setLevel(level) {
        if (this.#logLevels[level] !== undefined) {
            this.#currentLevel = this.#logLevels[level];
            console.log(`[Logger] Niveau de log défini à: ${level}`);
        }
    }

    /**
     * Log DEBUG
     */
    static debug(module, message, data = null) {
        this.#log('debug', module, message, data);
    }

    /**
     * Log INFO
     */
    static info(module, message, data = null) {
        this.#log('info', module, message, data);
    }

    /**
     * Log WARNING
     */
    static warn(module, message, data = null) {
        this.#log('warn', module, message, data);
    }

    /**
     * Log ERROR
     */
    static error(module, message, data = null) {
        this.#log('error', module, message, data);
    }

    /**
     * Log CRITICAL
     */
    static critical(module, message, data = null) {
        this.#log('critical', module, message, data);
    }

    /**
     * Méthode privée de log
     */
    static #log(level, module, message, data) {
        const levelValue = this.#logLevels[level];
        
        // Ne log que si le niveau est suffisant
        if (levelValue < this.#currentLevel) {
            return;
        }

        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            module,
            message,
            data
        };

        // Stocker le log
        this.#logs.push(logEntry);
        
        // Limiter la taille du tableau
        if (this.#logs.length > this.#maxLogs) {
            this.#logs.shift();
        }

        // Afficher dans la console
        const prefix = `[${timestamp}] [${level.toUpperCase()}] [${module}]`;
        const logMessage = data ? `${message}` : message;
        
        switch (level) {
            case 'debug':
                console.log(`%c${prefix}`, 'color: #888', logMessage, data || '');
                break;
            case 'info':
                console.log(`%c${prefix}`, 'color: #0066ff', logMessage, data || '');
                break;
            case 'warn':
                console.warn(prefix, logMessage, data || '');
                break;
            case 'error':
                console.error(prefix, logMessage, data || '');
                break;
            case 'critical':
                console.error(`%c${prefix}`, 'color: #ff0000; font-weight: bold', logMessage, data || '');
                break;
        }
    }

    /**
     * Récupère tous les logs
     */
    static getLogs() {
        return [...this.#logs];
    }

    /**
     * Récupère les logs d'un niveau spécifique
     */
    static getLogsByLevel(level) {
        return this.#logs.filter(log => log.level === level);
    }

    /**
     * Récupère les logs d'un module spécifique
     */
    static getLogsByModule(module) {
        return this.#logs.filter(log => log.module === module);
    }

    /**
     * Efface tous les logs
     */
    static clear() {
        this.#logs = [];
        console.clear();
        this.info('Logger', 'Logs effacés');
    }

    /**
     * Exporte les logs en JSON
     */
    static export() {
        return JSON.stringify(this.#logs, null, 2);
    }
}

// Export par défaut (IMPORTANT!)
export default Logger;
