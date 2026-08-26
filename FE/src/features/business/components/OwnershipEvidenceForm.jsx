import { Alert, Form, Input, Radio, Typography, Upload } from 'antd'
import { PlusOutlined } from '@ant-design/icons'

export function OwnershipEvidenceForm({ fileList, onFileListChange, existingImages = [] }) {
  return (
    <>
      <Form.Item
        name="relationship"
        label="Quan hệ với cơ sở"
        rules={[{ required: true, message: 'Vui lòng chọn quan hệ với cơ sở.' }]}
      >
        <Radio.Group
          options={[
            { value: 'owner', label: 'Chủ cơ sở' },
            { value: 'authorized_representative', label: 'Người đại diện được ủy quyền' },
            { value: 'authorized_manager', label: 'Quản lý được ủy quyền' },
          ]}
        />
      </Form.Item>
      <Form.Item
        name="contactName"
        label="Người liên hệ"
        rules={[
          { required: true, whitespace: true, message: 'Vui lòng nhập tên người liên hệ.' },
          { min: 2, max: 100, message: 'Tên người liên hệ phải từ 2 đến 100 ký tự.' },
        ]}
      >
        <Input autoComplete="name" />
      </Form.Item>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(15rem, 1fr))', gap: 16 }}>
        <Form.Item name="contactPhone" label="Số điện thoại">
          <Input autoComplete="tel" />
        </Form.Item>
        <Form.Item name="contactEmail" label="Email" rules={[{ type: 'email', message: 'Email không hợp lệ.' }]}>
          <Input autoComplete="email" />
        </Form.Item>
      </div>
      <Form.Item
        noStyle
        shouldUpdate={(previous, current) => (
          previous.contactPhone !== current.contactPhone || previous.contactEmail !== current.contactEmail
        )}
      >
        {({ getFieldValue }) => (!getFieldValue('contactPhone') && !getFieldValue('contactEmail') ? (
          <Typography.Text type="danger">Cần cung cấp ít nhất số điện thoại hoặc email.</Typography.Text>
        ) : null)}
      </Form.Item>
      <Form.Item
        name="note"
        label="Ghi chú giải thích"
        rules={[
          { required: true, whitespace: true, message: 'Vui lòng giải thích mối liên hệ và nội dung ảnh.' },
          { min: 20, max: 1000, message: 'Ghi chú phải từ 20 đến 1000 ký tự.' },
        ]}
      >
        <Input.TextArea rows={5} placeholder="Mô tả mối liên hệ của bạn với địa điểm và nội dung các ảnh..." />
      </Form.Item>
      {existingImages.length ? (
        <div style={{ marginBottom: 12 }}>
          <Typography.Text strong>Ảnh hiện có ({existingImages.length})</Typography.Text>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {existingImages.map((image) => (
              <img key={image.publicId ?? image.url} src={image.url} alt="Bằng chứng ownership" width="96" height="72" style={{ objectFit: 'cover', borderRadius: 8 }} />
            ))}
          </div>
        </div>
      ) : null}
      <Form.Item label={existingImages.length ? 'Thay toàn bộ ảnh bằng chứng (không bắt buộc)' : 'Ảnh chứng minh mối liên hệ với địa điểm'} required={!existingImages.length}>
        <Upload
          listType="picture-card"
          accept="image/jpeg,image/png,image/webp"
          beforeUpload={() => false}
          fileList={fileList}
          multiple
          maxCount={5}
          onChange={({ fileList: next }) => onFileListChange(next)}
        >
          {fileList.length >= 5 ? null : <div><PlusOutlined /><div style={{ marginTop: 8 }}>Chọn ảnh</div></div>}
        </Upload>
        <Typography.Text type="secondary">
          1–5 ảnh, tối đa 5 MB/ảnh và 20 MB/hồ sơ. Ví dụ: ảnh tại cơ sở, biển hiệu hoặc tài liệu thể hiện quyền đại diện.
        </Typography.Text>
      </Form.Item>
      <Alert
        type="warning"
        showIcon
        message="Không tải CCCD hoặc giấy tờ tùy thân"
        description="Hãy che số định danh, số tài khoản, chữ ký và dữ liệu cá nhân không liên quan. Ảnh chỉ dùng để xác minh quyền quản lý trên HueTrip, không phải chứng nhận quyền sở hữu pháp lý."
      />
    </>
  )
}
