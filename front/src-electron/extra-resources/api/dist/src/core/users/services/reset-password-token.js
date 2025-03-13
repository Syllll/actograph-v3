"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResetPasswordToken = void 0;
class ResetPasswordToken {
    constructor(parent, parentRepository, jwtService) {
        this.parent = parent;
        this.parentRepository = parentRepository;
        this.jwtService = jwtService;
    }
    async createResetPasswordToken(username) {
        return '';
    }
}
exports.ResetPasswordToken = ResetPasswordToken;
//# sourceMappingURL=reset-password-token.js.map