// Adapter disabled for now due to missing dependencies
export class ConfigAdapter {
  static toExpandableRowsConfig(config: any): any {
    return { options: {}, tableColumnDefaultConfig: {} };
  }
  static fromExpandableRowsConfig(config: any): any {
    return {};
  }
}
