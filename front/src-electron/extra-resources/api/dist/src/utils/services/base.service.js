"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseService = void 0;
const fs = require("fs");
const path = require("path");
const index_1 = require("../../utils/files/index");
class BaseService {
    constructor(_repository) {
        this._repository = _repository;
    }
    addUniquely(relations, ...strings) {
        for (const str of strings)
            if (!relations.includes(str))
                relations.push(str);
    }
    async findAndPaginate(options) {
        const results = await this._repository.findAndPaginate(options);
        return results;
    }
    async findAll() {
        return await this._repository.find({
            order: { id: 'DESC' },
        });
    }
    async findOne(id, options) {
        return await this._repository.findOneFromId(id, options);
    }
    async delete(id) {
        const entity = await this._repository.findOneFromId(id);
        await this._repository.softDelete(id);
        return entity;
    }
    async uploadFile(file, subfolder) {
        const folder = path.join(String(process.env.UPLOAD_FOLDER), subfolder);
        await (0, index_1.createFolderIfNeeded)(folder);
        let filename = file.originalname;
        let filepath = path.join(folder, filename);
        if (fs.existsSync(filepath)) {
            const extension = path.extname(filename);
            filename = filename.replace(extension, `${new Date().toISOString().slice(2, 19).replace(/[-TZ:]/g, '')}.${extension}`);
            filepath = path.join(folder, filename);
            console.log({ extension, filepath });
        }
        fs.appendFileSync(filepath, file.buffer, {
            flag: 'wx',
        });
        const publicPath = filepath.replace(`${process.env.PUBLIC_UPLOADS_FOLDER}`, '');
        return {
            filename,
            filepath,
            size: file.size,
            mimetype: file.mimetype,
            originalname: file.originalname,
            publicpath: publicPath,
            url: `${process.env.API_URL}${publicPath}`
        };
    }
}
exports.BaseService = BaseService;
//# sourceMappingURL=base.service.js.map