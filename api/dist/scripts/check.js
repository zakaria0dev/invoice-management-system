"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("../config/prisma"));
async function checkRoles() {
    const roles = await prisma_1.default.userRole.findMany({
        include: { _count: { select: { users: true } } },
    });
    console.log('Current roles:');
    roles.forEach(role => {
        console.log(`  ID: ${role.id}, Name: "${role.name}", isSystem: ${role.isSystem}, Users: ${role._count.users}`);
    });
    await prisma_1.default.$disconnect();
}
checkRoles();
