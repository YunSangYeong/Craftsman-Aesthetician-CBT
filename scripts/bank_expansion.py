"""Authored concepts and explicitly labelled numerical practice variants.
No past-exam data. Numbers are hypothetical, not product instructions.
"""
from pathlib import Path
from decimal import Decimal, ROUND_HALF_UP
from itertools import product
import json

ROOT = Path(__file__).resolve().parents[1]
SUBJECTS = ['피부미용학','피부학 및 해부생리학','피부미용기기학','화장품학','공중위생관리학']
NOTE = 'AI 일반 지식으로 자체 작성 후 문장·정답·보기의 내부 대조 검토. 외부 자료 대조·전문가 검수·공식 출제기준 대조 미완료. 저장소 링크는 작성·검토 기록이며 외부 정답 증빙이 아님.'
SOURCE = 'https://github.com/YunSangYeong/Craftsman-Aesthetician-CBT/blob/feat/skin-cbt-standard-20261026/docs/question-review.md'

def number(value, precision):
    n=Decimal(str(value)).quantize(Decimal(1).scaleb(-precision),rounding=ROUND_HALF_UP)
    return format(n,'f').rstrip('0').rstrip('.') if '.' in format(n,'f') else format(n,'f')

def question(index, subject, topic, prompt, choices, answer, explanation, **extra):
    assert len(choices)==4 and len(set(choices))==4
    assert 1<=answer<=4 and len(explanation)>30
    return dict(id=f'SKIN-{index:04}',subject=subject,topic=topic,question=prompt,choices=choices,answer=answer,
        explanation=explanation,difficulty='중',year=None,session=None,type='original',sourceUrl=SOURCE,
        verificationStatus='reviewed',reviewNote=NOTE,version='main',rights='자체 제작 학습 문항 · CC BY 4.0 · Craftsman-Aesthetician-CBT contributors',**extra)

def concept_questions():
    result=[]; group=None; counts={}
    for line in (ROOT/'scripts/manuscripts/concepts.tsv').read_text().splitlines():
        if not line or line.startswith('#'): continue
        if line.startswith('@'):
            fields=line[1:].split('|'); group=(int(fields[0]),fields[1],fields[2:]); assert len(group[2])==6
            continue
        prompt,answer,explanation=line.split('|'); correct=int(answer)
        subject_index,topic,pool=group
        # Deterministic nearby distractors; answer positions balanced across IDs.
        choices=[pool[correct]]+[pool[(correct+j)%6] for j in (1,2,3)]
        shift=len(result)%4;choices=choices[shift:]+choices[:shift]
        result.append(question(101+len(result),SUBJECTS[subject_index],topic,prompt,choices,choices.index(pool[correct])+1,
            f'정답은 {pool[correct]}이다. {explanation}'))
        counts[subject_index]=counts.get(subject_index,0)+1
    assert len(result)==300 and set(counts.values())=={60}
    return result


def numeric_questions():
    rows=[]
    def add(subject,kind,topic,values,unit,precision,prompt,formula,result,note):
        result=Decimal(str(result)); text=number(result,precision)
        actual=Decimal(text)
        patterns=[('0.1','0.5','2'),('0.5','2','10'),('2','3','10'),('0.1','0.25','0.5')]
        pattern=patterns[(len(rows)+len(rows)//4)%4]
        options=[text]+[number(actual*Decimal(factor),precision) for factor in pattern]
        assert len(set(options))==4,(kind,values,options)
        index=401+len(rows);shift=(index-1)%4
        options=options[shift:]+options[:shift]; choices=[f'{x} {unit}' for x in options]
        rounding='정수로 계산한다.' if precision==0 else f'소수 {precision}자리까지 반올림하며 끝의 0은 생략할 수 있다.'
        explanation=f'{formula} 따라서 {text} {unit}이다. {rounding} {note}'
        rows.append(question(index,SUBJECTS[subject],f'{topic} · 자체 제작 계산 조건 변형',f'{prompt} {rounding}',choices,options.index(text)+1,explanation,
            family=f'SKIN-CALC-{kind}',calculation=dict(kind=kind,values=values,result=float(actual),unit=unit,precision=precision)))
        rows[-1]['reviewNote'] += ' 계산은 Python Decimal 생성과 별도의 TypeScript 공식·역대입·단위 검증으로 대조한다. 숫자 조건 변형이며 독립 기출이 아니다.'
    for powder,ratio in product(range(30,60),(2,3)):
        add(0,'packRatio','팩 재료 질량비',[powder,1,ratio],'g',0,
            f'가상 모델링 팩의 혼합비를 분말:물=1:{ratio}(질량비)로 정했다. 분말 {powder} g에 필요한 물의 질량은?',
            f'물의 질량=분말 질량×물의 비율/분말의 비율={powder}×{ratio}/1={powder*ratio} g.',
            powder*ratio,'학습용 가정이며 실제 제품 혼합비나 사용법을 제시하는 것이 아니다. 실제 제품 지침을 따른다.')
    for area,dose in product(range(100,400,10),(1,2)):
        result=Decimal(area)*dose/1000
        add(0,'arealDose','가상 도포량 단위 변환',[area,dose],'g',3,
            f'가상 재료를 {area} cm² 면적에 {dose} mg/cm²씩 균일하게 도포한다고 가정한다. 손실이 없다면 필요한 총질량은?',
            f'질량=면적×면적당 질량={area}×{dose}={area*dose} mg. 1,000 mg=1 g이므로 {area*dose}/1,000 g.',
            result,'실제 피부의 권장량이나 자외선 차단 시험의 기준량이 아닌 단위 변환 연습이다.')
    for heart_rate,stroke in product(range(60,80),(50,65,80)):
        add(1,'cardiacOutput','심박출량 계산',[heart_rate,stroke],'L/min',3,
            f'가상 생리학 사례에서 심박수는 {heart_rate} 회/min, 1회 박출량은 {stroke} mL/회로 일정하다. 분당 심박출량은?',
            f'심박출량=심박수×1회 박출량={heart_rate}×{stroke}={heart_rate*stroke} mL/min. 1,000 mL=1 L로 변환한다.',
            Decimal(heart_rate)*stroke/1000,'문항에 주어진 일정한 값의 산술 계산이며 정상 범위 판정이나 진단이 아니다.')
    for tidal,rate in product(range(400,700,50),range(10,20)):
        add(1,'minuteVentilation','분당 환기량 계산',[tidal,rate],'L/min',3,
            f'가상 사례의 1회 호흡량이 {tidal} mL/회, 호흡수가 {rate} 회/min으로 일정하다. 사강을 빼지 않은 분당 총환기량은?',
            f'분당 총환기량=1회 호흡량×호흡수={tidal}×{rate}={tidal*rate} mL/min. 1,000으로 나누어 L/min으로 바꾼다.',
            Decimal(tidal)*rate/1000,'폐포 환기량을 묻는 문제가 아니며 임상적인 정상 여부를 판정하지 않는다.')
    for frequency in range(20,80):
        add(2,'wavePeriod','기기 기초 파형의 주기',[frequency],'μs',2,
            f'피부미용기기 기초 이론에서 반복 파형의 주파수가 {frequency} kHz이다. 이 파형의 한 주기는?',
            f'주기 T=1/f. {frequency} kHz={frequency*1000} Hz이고 1 s=1,000,000 μs이므로 T=1,000/{frequency} μs.',
            Decimal(1000)/frequency,'주기 계산만 다루며 특정 장치의 효과나 안전한 설정값을 제시하지 않는다.')
    for power,minutes in product(range(10,30),(1,2,3)):
        add(2,'deviceEnergy','기기 소비 에너지',[power,minutes],'J',0,
            f'가상 피부관리기기가 일정하게 {power} W의 전력을 {minutes}분 동안 소비한다. 소비 전기에너지는?',
            f'시간={minutes}×60={minutes*60} s. 에너지 E=전력 P×시간 t={power}×{minutes*60}={power*minutes*60} J.',
            power*minutes*60,'소비 전기에너지는 피부에 실제로 흡수된 에너지나 안전한 조사량과 동일하다고 볼 수 없다.')
    for total,concentration in product(range(50,350,10),(2,4)):
        add(3,'massPercent','질량 백분율',[total,concentration],'g',3,
            f'가상 화장품 원료 배합 연습에서 완제품 총질량은 {total} g이고 특정 성분은 {concentration}%(w/w)이다. 해당 성분의 질량은?',
            f'w/w는 용액 총질량에 대한 성분 질량의 백분율이다. 성분 질량={total}×{concentration}/100 g.',
            Decimal(total)*concentration/100,'실제 배합 처방이나 법정 허용 농도가 아닌 질량비 계산용 가정이다.')
    for stock,final_volume in product((10,20),range(100,400,10)):
        add(3,'volumeDilution','가상 용액 부피 희석',[stock,2,final_volume],'mL',2,
            f'부피가 가산된다고 가정하는 학습용 용액에서 {stock}%(v/v) 원액으로 2%(v/v) 용액 {final_volume} mL를 만들려고 한다. 필요한 원액 부피는?',
            f'성분량 보존식 C₁V₁=C₂V₂를 쓴다. V₁=2×{final_volume}/{stock} mL이며 물을 더해 최종 부피를 {final_volume} mL로 맞춘다.',
            Decimal(2)*final_volume/stock,'실제 화장품이나 소독제의 희석법이 아니다. 제품의 안정성과 용도·희석 지침은 별도 확인해야 한다.')
    for before,reduction in product((1000,2000,5000),range(80,100)):
        after=before*(100-reduction)//100
        add(4,'countReduction','가상 집락수 감소율',[before,after],'%',2,
            f'위생관리 산술 연습의 가상 실험에서 처리 전 집락수가 {before}개, 처리 후가 {after}개였다. 감소율 (처리 전−처리 후)/처리 전×100은?',
            f'감소한 집락수={before}−{after}={before-after}개. 감소율=({before}−{after})/{before}×100={reduction}%.',
            reduction,'가상 관찰 수치의 비율 연습이며 멸균 성공·법정 소독 기준 충족·실제 제품 효능을 판정하지 않는다.')
    for population,cases in product(range(200,800,100),range(1,11)):
        add(4,'cumulativeIncidence','누적발생 비율',[population,cases],'%',2,
            f'관찰 시작 시 해당 질환이 없는 {population}명을 일정 기간 탈락 없이 관찰했더니 새 사례가 {cases}명 발생했다. 이 기간의 단순 누적발생 비율은?',
            f'누적발생 비율=새 사례 수/처음 위험 집단 수×100={cases}/{population}×100%.',
            Decimal(cases)*100/population,'인시 발생률이 아닌 단순 비율이다. 가상 집단이며 실제 고객이나 특정 질환의 발생 위험 자료가 아니다.')
    assert len(rows)==600
    return rows


def expand_bank(existing):
    assert len(existing)==100
    result=existing+concept_questions()+numeric_questions()
    assert len(result)==1000
    assert all(sum(q['subject']==s for q in result)==200 for s in SUBJECTS)
    normalized=lambda q: ''.join((q['question']+'|'+ '|'.join(sorted(q['choices']))).split()).lower()
    assert len({q['id'] for q in result})==1000
    assert len({normalized(q) for q in result})==1000
    return result
