export declare class UserUpdateCurrentDto {
    firstname?: string;
    lastname?: string;
    preferDarkTheme?: boolean;
    resetPasswordOngoing?: boolean;
}
export declare class UserUpdateDto extends UserUpdateCurrentDto {
    id: number;
}
