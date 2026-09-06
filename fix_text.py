import sys

with open('frontend/src/components/admin/PeriodsTab.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('{React.createElement("ion-icon", { name: "pencil-outline" })} S?a\n              hàng lo?t', '{React.createElement("ion-icon", { name: "musical-notes-outline" })} Ð?i nh?c\n              hàng lo?t')

content = content.replace('name: "pencil-outline",\n                  style: { marginRight: "4px" },\n                })}{" "}\n                S?a hàng lo?t', 'name: "musical-notes-outline",\n                  style: { marginRight: "4px" },\n                })}{" "}\n                Ð?i nh?c')

with open('frontend/src/components/admin/PeriodsTab.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
